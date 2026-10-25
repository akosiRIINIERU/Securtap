import { supabase } from './supabase';

function formatTuyaFunctionError(parsed, fallbackError, httpStatus) {
  const errorText = parsed?.error || '';
  const tuyaMessage = parsed?.tuyaMessage || '';
  const parts = [
    errorText,
    tuyaMessage && !errorText.includes(tuyaMessage) ? tuyaMessage : null,
    parsed?.tuyaCode != null ? `Tuya error ${parsed.tuyaCode}` : null,
    !errorText && httpStatus
      ? `Smart Lock request failed (HTTP ${httpStatus}).`
      : null,
  ].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(' — ');
  }

  return (
    fallbackError?.message ||
    'The Smart Lock function failed. Check Supabase logs.'
  );
}

async function readInvokeError(error) {
  const context = error?.context;
  const status = context?.status;
  let responseBody = '';
  let parsed = null;

  if (context && typeof context.text === 'function') {
    try {
      const source =
        typeof context.clone === 'function' ? context.clone() : context;
      responseBody = await source.text();
    } catch (readError) {
      console.error('Could not read Edge Function response body:', readError);
    }
  }

  if (responseBody) {
    console.error('Edge Function HTTP status:', status);
    console.error('Edge Function response body:', responseBody);

    try {
      parsed = JSON.parse(responseBody);
    } catch {
      // The response may not be JSON.
    }
  } else if (context) {
    console.error('Edge Function HTTP status:', status);
    console.error('Edge Function context:', context);
  }

  return formatTuyaFunctionError(parsed, error, status);
}

export async function invokeTuyaLock({
  action = 'status',
  deviceId,
  ...params
} = {}) {
  try {
    // 1. Check the Supabase session.
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Supabase session error:', sessionError.message);
      throw new Error('Unable to verify your session. Please log in again.');
    }

    if (!session?.access_token) {
      throw new Error('Please log in again.');
    }

    // 2. Invoke the existing Edge Function.
    // Keep this name consistent with your deployed function.
    const { data, error } = await supabase.functions.invoke(
      'tuya-lock-status',
      {
        body: {
          ...params,
          action,
          ...(deviceId ? { deviceId } : {}),
        },
      }
    );

    // 3. Log the actual response when the invocation fails.
    if (error) {
      console.error('Supabase function error:', {
        name: error.name,
        message: error.message,
      });

      throw new Error(await readInvokeError(error));
    }

    // 4. Check the function response.
    if (!data) {
      throw new Error('The Smart Lock function returned no data.');
    }

    if (data.error) {
      console.error('Smart Lock backend error:', {
        message: data.error,
        tuyaCode: data.tuyaCode ?? null,
      });

      throw new Error(formatTuyaFunctionError(data));
    }

    console.log('Smart Lock request succeeded:', {
      action,
      success: data.success,
      deviceId: data.deviceId ?? null,
      checkedAt: data.checkedAt ?? null,
    });

    return data;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'An unexpected Smart Lock error occurred.';

    console.error('Tuya lock operation error:', message);

    throw error instanceof Error ? error : new Error(message);
  }
}

export function summarizeLockStatus(statusItems = []) {
  const map = {};

  (Array.isArray(statusItems) ? statusItems : []).forEach((item) => {
    if (item?.code) {
      map[item.code] = item.value;
    }
  });

  let locked = null;

  if (map.closed_opened === 0 || map.closed_opened === 'closed') {
    locked = true;
  } else if (
    map.closed_opened === 1 ||
    map.closed_opened === 'open'
  ) {
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