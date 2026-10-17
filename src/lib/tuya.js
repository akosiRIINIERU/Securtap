import { supabase, getSupabaseErrorMessage } from './supabase';

export async function invokeTuyaLock({
  action = 'status',
  deviceId,
} = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Please log in again.');
  }

  const { data, error } = await supabase.functions.invoke(
    'tuya-lock-status',
    {
      body: {
        action,
        deviceId,
      },
    }
  );

  if (error) {
    throw new Error(getSupabaseErrorMessage(error));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

export function summarizeLockStatus(statusItems = []) {
  const map = {};

  (Array.isArray(statusItems) ? statusItems : []).forEach((item) => {
    if (item?.code) {
      map[item.code] = item.value;
    }
  });

  const lockedCodes = [
    'closed_opened',
    'lock_motor_state',
    'doorcontact_state',
  ];

  let locked = null;

  if (map.closed_opened === 0 || map.closed_opened === 'closed') {
    locked = true;
  } else if (map.closed_opened === 1 || map.closed_opened === 'open') {
    locked = false;
  } else if (typeof map.lock_motor_state === 'boolean') {
    locked = map.lock_motor_state;
  }

  const battery =
    map.residual_electricity ??
    map.battery_percentage ??
    map.battery_state ??
    null;

  return {
    map,
    locked,
    battery,
    online: map.online,
  };
}
