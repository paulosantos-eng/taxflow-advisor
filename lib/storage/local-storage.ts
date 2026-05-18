// Camada de persistencia em localStorage (pre-DB)
// Em producao real, vira chamadas para API backend + DB Postgres

import type { Client, Operation, Vehicle, VehicleType } from "../tax-engine/types";

const KEY_CUSTOM_CLIENTS = "taxflow:custom_clients";
const KEY_CUSTOM_OPERATIONS = "taxflow:custom_operations";
const KEY_CUSTOM_VEHICLES = "taxflow:custom_vehicles_by_client";
const KEY_MONTHLY_INPUTS = "taxflow:monthly_inputs";

// ============================================================================
// CLIENTES
// ============================================================================

export function getCustomClients(): Client[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_CLIENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomClient(client: Client): void {
  if (typeof window === "undefined") return;
  const all = getCustomClients();
  const idx = all.findIndex((c) => c.id === client.id);
  if (idx >= 0) all[idx] = client;
  else all.push(client);
  localStorage.setItem(KEY_CUSTOM_CLIENTS, JSON.stringify(all));
}

export function deleteCustomClient(clientId: string): void {
  if (typeof window === "undefined") return;
  const all = getCustomClients().filter((c) => c.id !== clientId);
  localStorage.setItem(KEY_CUSTOM_CLIENTS, JSON.stringify(all));
  // Limpa operacoes e veiculos relacionados
  const ops = getAllCustomOperations();
  delete ops[clientId];
  localStorage.setItem(KEY_CUSTOM_OPERATIONS, JSON.stringify(ops));
  const veh = getAllCustomVehicles();
  delete veh[clientId];
  localStorage.setItem(KEY_CUSTOM_VEHICLES, JSON.stringify(veh));
}

// ============================================================================
// VEICULOS POR CLIENTE
// ============================================================================

type VehiclesByClient = Record<string, Vehicle[]>;

function getAllCustomVehicles(): VehiclesByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_VEHICLES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomVehicles(clientId: string): Vehicle[] {
  return getAllCustomVehicles()[clientId] ?? [];
}

export function addCustomVehicle(clientId: string, vehicle: Vehicle): void {
  if (typeof window === "undefined") return;
  const all = getAllCustomVehicles();
  if (!all[clientId]) all[clientId] = [];
  all[clientId].push(vehicle);
  localStorage.setItem(KEY_CUSTOM_VEHICLES, JSON.stringify(all));
}

export function deleteCustomVehicle(clientId: string, vehicleId: string): void {
  if (typeof window === "undefined") return;
  const all = getAllCustomVehicles();
  if (all[clientId]) {
    all[clientId] = all[clientId].filter((v) => v.id !== vehicleId);
    localStorage.setItem(KEY_CUSTOM_VEHICLES, JSON.stringify(all));
  }
}

// ============================================================================
// OPERACOES POR CLIENTE
// ============================================================================

type OperationsByClient = Record<string, Operation[]>;

function getAllCustomOperations(): OperationsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_CUSTOM_OPERATIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getCustomOperations(clientId: string): Operation[] {
  return getAllCustomOperations()[clientId] ?? [];
}

export function saveCustomOperations(clientId: string, ops: Operation[]): void {
  if (typeof window === "undefined") return;
  const all = getAllCustomOperations();
  all[clientId] = ops;
  localStorage.setItem(KEY_CUSTOM_OPERATIONS, JSON.stringify(all));
}

// ============================================================================
// INPUTS MENSAIS (grade)
// ============================================================================

export interface MonthlyInput {
  proLabore: number;
  dividendoPjPropria: number;
  outrosRendimentos: number;
}

export type MonthlyInputs = Record<number, MonthlyInput>; // chave = mes 1-12

type MonthlyInputsByClient = Record<string, MonthlyInputs>;

function getAllMonthlyInputs(): MonthlyInputsByClient {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY_MONTHLY_INPUTS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getMonthlyInputs(clientId: string): MonthlyInputs {
  return getAllMonthlyInputs()[clientId] ?? {};
}

export function saveMonthlyInputs(clientId: string, inputs: MonthlyInputs): void {
  if (typeof window === "undefined") return;
  const all = getAllMonthlyInputs();
  all[clientId] = inputs;
  localStorage.setItem(KEY_MONTHLY_INPUTS, JSON.stringify(all));
}

// ============================================================================
// UTILITARIOS
// ============================================================================

export function generateClientId(): string {
  return `cli_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function generateVehicleId(clientId: string): string {
  return `vec_${clientId.slice(4)}_${Date.now().toString(36)}`;
}

// Converte inputs mensais em operacoes que o engine processa
export function inputsToOperations(
  clientId: string,
  vehicleId: string,
  inputs: MonthlyInputs,
  year: number,
  cnpjPjPropria?: string
): Operation[] {
  const ops: Operation[] = [];
  const PLACEHOLDER_PL = {
    code: "PRO_LABORE",
    name: "Pro-labore",
    class: "acao_br" as const,
    currency: "BRL",
  };
  const PLACEHOLDER_DIST = {
    code: "DIST_PJ",
    name: "Distribuicao PJ propria",
    class: "acao_br" as const,
    currency: "BRL",
  };

  for (let m = 1; m <= 12; m++) {
    const input = inputs[m];
    if (!input) continue;
    const date = `${year}-${String(m).padStart(2, "0")}-05`;
    if (input.proLabore > 0) {
      ops.push({
        id: `custom_pl_${clientId}_${m}`,
        vehicleId,
        asset: PLACEHOLDER_PL,
        type: "pro_labore",
        date,
        totalValue: input.proLabore,
        payerCnpj: cnpjPjPropria,
      });
    }
    if (input.dividendoPjPropria > 0) {
      ops.push({
        id: `custom_dist_${clientId}_${m}`,
        vehicleId,
        asset: PLACEHOLDER_DIST,
        type: "distribuicao_pj_propria",
        date: `${year}-${String(m).padStart(2, "0")}-25`,
        totalValue: input.dividendoPjPropria,
        payerCnpj: cnpjPjPropria,
      });
    }
  }
  return ops;
}
