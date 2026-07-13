import type { RuntimeProbe } from "../tauri";
import type { ResourceForm } from "../types";

export function resourceFormFromProbe(prev: ResourceForm, probe: RuntimeProbe): ResourceForm {
  const overlayIp = preferredOverlayIp(probe);
  const overlayMachineId = probe.overlay?.machineId?.trim() || "";
  if (probe.overlay?.available && overlayIp && overlayMachineId) {
    return {
      ...prev,
      name: prev.name || probe.hostname,
      endpointType: "overlay",
      provider: overlayProvider(probe),
      address: overlayIp,
      machineId: overlayMachineId,
    };
  }

  const ipv6 = probe.ipv6Addresses[0] || "";
  return {
    ...prev,
    name: prev.name || probe.hostname,
    endpointType: ipv6 ? "ipv6" : prev.endpointType,
    provider: ipv6 ? "native" : prev.provider,
    address: prev.address || ipv6,
  };
}

export function preferredOverlayIp(probe: RuntimeProbe) {
  const ips = probe.overlay?.overlayIps ?? [];
  return ips.find((ip) => ip.includes(".")) || ips[0] || "";
}

export function overlayProvider(probe: RuntimeProbe) {
  const loginServer = probe.overlay?.loginServer?.toLowerCase() || "";
  return loginServer.includes("tailscale.com") ? "tailscale" : "headscale";
}
