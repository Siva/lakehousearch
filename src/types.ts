export type MedallionLayer = 'bronze' | 'silver' | 'gold';
export type EnterpriseDomain = 'customer' | 'orders' | 'products' | 'finance' | 'governance';
export type InsuranceDomain = EnterpriseDomain; // Aliased for backward compatibility
export type SqlPlatform = 'delta' | 'snowflake' | 'bigquery';

export interface ColumnDefinition {
  name: string;
  dataType: string;
  suffix: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  isSurrogateKey?: boolean;
  isAudit?: boolean;
  isNullable: boolean;
  isPartitionKey?: boolean;
  description: string;
  transformationLogic?: string;
  sampleValue?: string;
}

export interface TableDefinition {
  id: string;
  name: string;
  layer: MedallionLayer;
  domain: EnterpriseDomain;
  grain: string;
  description: string;
  businessPurpose: string;
  sourceEntity: string;
  primaryKey: string[];
  partitionKeys: string[];
  scdPattern: 'SCD1' | 'SCD2' | 'Append-Only' | 'Periodic Snapshot' | 'Accumulating Snapshot';
  columns: ColumnDefinition[];
  upstreamTables?: string[];
  downstreamConsumers?: string[];
}

export interface AuditColumnSpec {
  name: string;
  dataType: string;
  category: 'Source Lineage' | 'Pipeline Execution' | 'Bi-Temporal SCD2' | 'Data Integrity' | 'Governance';
  description: string;
  rule: string;
  exampleValue: string;
}

export interface Scd2SimulationStep {
  stepNumber: number;
  eventTitle: string;
  eventDescription: string;
  timestamp: string;
  incomingPayload: Record<string, any>;
  resultingRows: Array<{
    id: string;
    version_id: string;
    business_key: string;
    tier_plan_cd: string;
    mrr_amt: number;
    seats_cnt: number;
    valid_from: string;
    valid_to: string;
    is_current: boolean;
    record_hash: string;
    action_highlight?: 'inserted' | 'expired' | 'unchanged';
  }>;
}

export interface NamingConventionRule {
  suffix: string;
  category: string;
  allowedTypes: string;
  ruleDescription: string;
  validExample: string;
  invalidExample: string;
  notes: string;
}

export interface RegulatoryFramework {
  id: string;
  title: string;
  authority: string;
  frequency: string;
  targetMarts: string[];
  keyMetrics: string[];
  lineageRequirements: string;
  summary: string;
  formulaOrFormat: string;
}

export interface TransformationRule {
  id: string;
  title: string;
  domain: EnterpriseDomain;
  sourceLayer: MedallionLayer;
  targetLayer: MedallionLayer;
  summary: string;
  sqlSnippet: string;
  businessRules: string[];
}
