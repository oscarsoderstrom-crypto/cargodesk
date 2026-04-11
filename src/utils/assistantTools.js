// assistantTools.js — Tool definitions sent to Claude + execution handlers
// Each tool definition matches the Anthropic tool_use schema.
// executeTool() dispatches to the right handler and returns a result string.

import {
  getShipments, getShipment, addShipment, updateShipment, getNextRef,
  addActivity, getDB,
} from '../db/schema.js';
import { formatContainer } from '../utils/containers.js';

// ─── Tool definitions (sent to Anthropic API) ─────────────────────────────────

export const TOOLS = [
  {
    name: 'create_shipment',
    description: 'Create a new shipment record in CargoDesk. Use when the user asks to create, add, or book a new shipment.',
    input_schema: {
      type: 'object',
      properties: {
        origin:         { type: 'string', description: 'Origin port/city, e.g. "Helsinki, FI"' },
        destination:    { type: 'string', description: 'Destination port/city, e.g. "Houston, US"' },
        mode:           { type: 'string', enum: ['ocean', 'air', 'truck'], description: 'Transport mode' },
        carrier:        { type: 'string', description: 'Carrier name, e.g. "Hapag-Lloyd"' },
        etd:            { type: 'string', description: 'ETD as YYYY-MM-DD' },
        eta:            { type: 'string', description: 'ETA as YYYY-MM-DD' },
        containerType:  { type: 'string', description: 'Container type ID: 20DV, 40DV, 40HC, 45HC, FTL, AIR' },
        containerCount: { type: 'number', description: 'Number of containers' },
        projectId:      { type: 'string', description: 'Project ID to link to (optional)' },
        customerRef:    { type: 'string', description: 'Customer shipment reference, e.g. "USGOLD 6"' },
        vessel:         { type: 'string', description: 'Vessel name (optional)' },
        voyage:         { type: 'string', description: 'Voyage number (optional)' },
        quotedAmount:   { type: 'number', description: 'Quoted amount to customer in EUR (optional)' },
        status:         { type: 'string', enum: ['planned', 'booked', 'in_transit', 'arrived', 'delivered'], description: 'Initial status, defaults to planned' },
      },
      required: ['origin', 'destination', 'mode'],
    },
  },
  {
    name: 'update_shipment',
    description: 'Update one or more fields on an existing shipment. Use for status changes, ETA updates, adding vessel info, etc.',
    input_schema: {
      type: 'object',
      properties: {
        shipmentId: { type: 'string', description: 'The shipment id (UUID)' },
        fields: {
          type: 'object',
          description: 'Fields to update. Allowed: status, etd, eta, carrier, vessel, voyage, origin, destination, routing, customerRef, blNumber, quotationNumber, billingDone',
          properties: {
            status:         { type: 'string', enum: ['planned', 'booked', 'in_transit', 'arrived', 'delivered', 'completed'] },
            etd:            { type: 'string', description: 'YYYY-MM-DD' },
            eta:            { type: 'string', description: 'YYYY-MM-DD' },
            carrier:        { type: 'string' },
            vessel:         { type: 'string' },
            voyage:         { type: 'string' },
            origin:         { type: 'string' },
            destination:    { type: 'string' },
            routing:        { type: 'string' },
            customerRef:    { type: 'string' },
            blNumber:       { type: 'string' },
            quotationNumber:{ type: 'string' },
            billingDone:    { type: 'boolean' },
          },
        },
      },
      required: ['shipmentId', 'fields'],
    },
  },
  {
    name: 'add_cost_item',
    description: 'Add a cost line item to a shipment.',
    input_schema: {
      type: 'object',
      properties: {
        shipmentId:  { type: 'string', description: 'The shipment id' },
        description: { type: 'string', description: 'Cost description, e.g. "Origin THC"' },
        amount:      { type: 'number', description: 'Amount (numeric)' },
        currency:    { type: 'string', enum: ['EUR', 'USD', 'SEK'], description: 'Currency' },
        category:    { type: 'string', enum: ['origin', 'transport', 'destination', 'other'], description: 'Cost category' },
      },
      required: ['shipmentId', 'description', 'amount', 'currency', 'category'],
    },
  },
  {
    name: 'mark_milestone_done',
    description: 'Mark a shipment milestone as completed. Match by milestone label text.',
    input_schema: {
      type: 'object',
      properties: {
        shipmentId:     { type: 'string', description: 'The shipment id' },
        milestoneLabel: { type: 'string', description: 'The milestone label to match (case-insensitive partial match)' },
      },
      required: ['shipmentId', 'milestoneLabel'],
    },
  },
  {
    name: 'add_note',
    description: 'Add a timestamped note to a shipment.',
    input_schema: {
      type: 'object',
      properties: {
        shipmentId: { type: 'string', description: 'The shipment id' },
        note:       { type: 'string', description: 'Note text to add' },
      },
      required: ['shipmentId', 'note'],
    },
  },
  {
    name: 'navigate_to_shipment',
    description: 'Open a shipment in the CargoDesk UI so the user can view or edit it.',
    input_schema: {
      type: 'object',
      properties: {
        shipmentId: { type: 'string', description: 'The shipment id to navigate to' },
      },
      required: ['shipmentId'],
    },
  },
];

// ─── Tool descriptions for pending confirmation UI ────────────────────────────

export function describeToolCall(name, input) {
  switch (name) {
    case 'create_shipment':
      return `Create shipment: ${input.origin} → ${input.destination} (${input.mode}${input.containerCount ? `, ${input.containerCount}×${input.containerType || ''}` : ''}${input.customerRef ? `, ${input.customerRef}` : ''})`;
    case 'update_shipment':
      return `Update shipment ${input.shipmentId?.slice(0, 8)}…: ${Object.entries(input.fields || {}).map(([k, v]) => `${k} → ${v}`).join(', ')}`;
    case 'add_cost_item':
      return `Add cost to ${input.shipmentId?.slice(0, 8)}…: ${input.description} ${input.currency} ${input.amount}`;
    case 'mark_milestone_done':
      return `Mark milestone done: "${input.milestoneLabel}" on ${input.shipmentId?.slice(0, 8)}…`;
    case 'add_note':
      return `Add note to ${input.shipmentId?.slice(0, 8)}…: "${input.note?.slice(0, 60)}${input.note?.length > 60 ? '…' : ''}"`;
    case 'navigate_to_shipment':
      return `Open shipment ${input.shipmentId?.slice(0, 8)}… in the UI`;
    default:
      return `${name}: ${JSON.stringify(input)}`;
  }
}

// ─── Tool execution handlers ──────────────────────────────────────────────────

/**
 * Execute a single tool call.
 * Returns { success: bool, message: string }
 * onNavigate(shipmentId) is a callback to open the shipment in the UI.
 */
export async function executeTool(name, input, onNavigate) {
  try {
    switch (name) {

      case 'create_shipment': {
        const ref = await getNextRef();
        const containerType = input.containerType || (input.mode === 'air' ? 'AIR' : input.mode === 'truck' ? 'FTL' : '40HC');
        const count = input.containerCount || 1;
        let containerLabel;
        try { containerLabel = formatContainer(containerType, count); }
        catch { containerLabel = `${count}×${containerType}`; }

        const oName = input.origin?.split(',')[0]?.trim() || 'Origin';
        const dName = input.destination?.split(',')[0]?.trim() || 'Destination';

        // Generate default milestones
        const milestones = [];
        let mi = 1;
        milestones.push({ id: `m${mi++}`, label: 'Cargo Ready', date: null, done: false });
        if (input.mode === 'ocean') {
          milestones.push({ id: `m${mi++}`, label: 'S/I Cut-off', date: null, done: false });
          milestones.push({ id: `m${mi++}`, label: 'VGM Cut-off', date: null, done: false });
        }
        milestones.push({ id: `m${mi++}`, label: `ETD ${oName}`, date: input.etd || null, done: false });
        milestones.push({ id: `m${mi++}`, label: `ETA ${dName}`, date: input.eta || null, done: false });
        milestones.push({ id: `m${mi++}`, label: 'Customs Clearance', date: null, done: false });
        milestones.push({ id: `m${mi++}`, label: 'Delivered', date: null, done: false });

        const shipment = {
          id: crypto.randomUUID(),
          ref,
          refPending: false,
          projectId: input.projectId || null,
          customerRef: input.customerRef || null,
          mode: input.mode,
          status: input.status || 'planned',
          origin: input.origin,
          destination: input.destination,
          carrier: input.carrier || '',
          vessel: input.vessel || 'TBD',
          voyage: input.voyage || 'TBD',
          routing: `${oName} → ${dName}`,
          etd: input.etd || null,
          eta: input.eta || null,
          containerType: containerLabel,
          containerTypeId: containerType,
          containerCount: count,
          milestones,
          costs: { quoted: input.quotedAmount || 0, items: [], running: [] },
          co2e: null,
        };

        await addShipment(shipment);
        await addActivity({
          id: crypto.randomUUID(),
          type: 'shipment',
          message: `Shipment created by AI: ${shipment.origin} → ${shipment.destination}`,
          shipmentId: shipment.id,
          timestamp: new Date().toISOString(),
        });

        return {
          success: true,
          message: `Created shipment ${ref} (${shipment.id}): ${shipment.origin} → ${shipment.destination}`,
          shipmentId: shipment.id,
        };
      }

      case 'update_shipment': {
        const existing = await getShipment(input.shipmentId);
        if (!existing) return { success: false, message: `Shipment ${input.shipmentId} not found` };

        // Whitelist safe fields
        const allowed = ['status', 'etd', 'eta', 'carrier', 'vessel', 'voyage', 'origin',
          'destination', 'routing', 'customerRef', 'blNumber', 'quotationNumber', 'billingDone'];
        const safe = {};
        for (const k of allowed) {
          if (input.fields[k] !== undefined) safe[k] = input.fields[k];
        }

        await updateShipment(input.shipmentId, safe);
        await addActivity({
          id: crypto.randomUUID(),
          type: 'status',
          message: `Updated by AI: ${Object.entries(safe).map(([k, v]) => `${k}=${v}`).join(', ')}`,
          shipmentId: input.shipmentId,
          timestamp: new Date().toISOString(),
        });

        const label = existing.ref || existing.customerRef || input.shipmentId.slice(0, 8);
        return { success: true, message: `Updated ${label}: ${Object.entries(safe).map(([k, v]) => `${k} → ${v}`).join(', ')}` };
      }

      case 'add_cost_item': {
        const shipment = await getShipment(input.shipmentId);
        if (!shipment) return { success: false, message: `Shipment ${input.shipmentId} not found` };

        const newItem = {
          id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          description: input.description,
          desc: input.description,
          amount: input.amount,
          currency: input.currency,
          category: input.category,
        };

        const updatedCosts = {
          ...shipment.costs,
          items: [...(shipment.costs?.items || []), newItem],
        };

        await updateShipment(input.shipmentId, { costs: updatedCosts });

        const label = shipment.ref || shipment.customerRef || input.shipmentId.slice(0, 8);
        return { success: true, message: `Added cost to ${label}: ${input.description} ${input.currency} ${input.amount}` };
      }

      case 'mark_milestone_done': {
        const shipment = await getShipment(input.shipmentId);
        if (!shipment) return { success: false, message: `Shipment ${input.shipmentId} not found` };

        const lbl = (input.milestoneLabel || '').toLowerCase();
        const milestones = (shipment.milestones || []).map(m => {
          if (!m.done && m.label.toLowerCase().includes(lbl)) {
            return { ...m, done: true };
          }
          return m;
        });

        const matched = milestones.filter((m, i) => m.done && !(shipment.milestones[i]?.done));
        if (!matched.length) {
          return { success: false, message: `No undone milestone matching "${input.milestoneLabel}" found` };
        }

        await updateShipment(input.shipmentId, { milestones });

        const label = shipment.ref || shipment.customerRef || input.shipmentId.slice(0, 8);
        return { success: true, message: `Marked "${matched[0].label}" as done on ${label}` };
      }

      case 'add_note': {
        const shipment = await getShipment(input.shipmentId);
        if (!shipment) return { success: false, message: `Shipment ${input.shipmentId} not found` };

        await addActivity({
          id: crypto.randomUUID(),
          type: 'note',
          message: input.note,
          shipmentId: input.shipmentId,
          timestamp: new Date().toISOString(),
        });

        const label = shipment.ref || shipment.customerRef || input.shipmentId.slice(0, 8);
        return { success: true, message: `Note added to ${label}` };
      }

      case 'navigate_to_shipment': {
        if (onNavigate) onNavigate(input.shipmentId);
        return { success: true, message: `Opened shipment ${input.shipmentId}` };
      }

      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  } catch (err) {
    console.error(`Tool ${name} failed:`, err);
    return { success: false, message: `${name} failed: ${err.message}` };
  }
}
