type DeviceCommand = {
  deviceId: string;
  action: string;
  payload?: Record<string, unknown>;
};

type DeviceState = {
  id: string;
  label: string;
  status: string;
  metrics?: Record<string, number>;
};

const API_BASE_URL = import.meta.env.VITE_DEVICES_API_URL as string | undefined;

export const fetchDevices = async (): Promise<DeviceState[]> => {
  if (!API_BASE_URL) {
    return [];
  }
  const response = await fetch(`${API_BASE_URL}/devices`);
  if (!response.ok) {
    throw new Error("Devices API unavailable");
  }
  return response.json();
};

export const sendDeviceCommand = async (command: DeviceCommand): Promise<void> => {
  if (!API_BASE_URL) {
    return;
  }
  const response = await fetch(`${API_BASE_URL}/commands`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!response.ok) {
    throw new Error("Device command failed");
  }
};
