export interface Loadbalancer {
  id: number;
  tags: string[];
  label: string;
  regions: string[];
  hostname: string;
  configurations: {
    id: number;
    label: string;
  }[];
}

export interface CreateLoadbalancerPayload {
  label: string;
  regions: string[];
  tags?: string[];
  configurations?: ConfigurationPayload[];
}

export interface UpdateLoadbalancerPayload {
  label: string;
  regions: string[];
  tags?: string[];
  configuration_ids?: number[];
}

type Protocol = 'TCP' | 'HTTP' | 'HTTPS';

type Policy =
  | 'round_robin'
  | 'least_request'
  | 'ring_hash'
  | 'random'
  | 'maglev';

type MatchField = 'path_prefix' | 'query' | 'host' | 'header' | 'method';

export interface RoutePayload {
  label: string;
  rules: Rule[];
}

export interface Route {
  id: number;
  label: string;
  rules: {
    match_condition: MatchCondition;
    service_targets: {
      id: number;
      label: string;
      percentage: number;
    }[];
  }[];
}

export interface CreateRoutePayload {
  label: string;
  rules: {
    match_condition: MatchCondition;
    service_targets: {
      id: number;
      label: string;
      percentage: number;
    }[];
  }[];
}

export interface ConfigurationPayload {
  label: string;
  port: number;
  protocol: Protocol;
  certificate_table: CertificateTable[];
  routes?: RoutePayload[];
  route_ids?: number[];
}

export interface Configuration {
  id: number;
  label: string;
  port: number;
  protocol: Protocol;
  certificate_table: CertificateTable[];
  routes: string[];
}

export interface CertificateTable {
  sni_hostname: string;
  certificate_id: string;
}

export interface Rule {
  match_condition: MatchCondition;
  service_targets: ServiceTargetPayload[];
}

export interface MatchCondition {
  hostname: string;
  match_field: MatchField;
  match_value: string;
  affinity_cookie: string | null;
  affinity_ttl: string | null;
}

export interface RouteServiceTargetPayload {
  service_target_name: string;
  service_target_percentage: number;
}

export interface ServiceTargetPayload {
  label: string;
  endpoints: Endpoint[];
  ca_certificate: string;
  load_balancing_policy: Policy;
  healthcheck: HealthCheck;
}

interface HealthCheck {
  interval: number;
  timeout: number;
  unhealthy_threshold: number;
  healthy_threshold: number;
  path: string;
  host: string;
}

export interface ServiceTarget extends ServiceTargetPayload {
  id: number;
}

export interface Endpoint {
  ip?: string;
  host?: string;
  port: number;
  rate_capacity: number;
}

type CertificateType = 'ca' | 'downstream';

export interface Certificate {
  id: number;
  label: string;
  type: CertificateType;
}

export interface CreateCertificatePayload {
  key?: string;
  certificate: string;
  label: string;
  type: CertificateType;
}
