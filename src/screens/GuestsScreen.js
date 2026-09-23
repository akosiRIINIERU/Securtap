import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  supabase,
  getSupabaseErrorMessage,
} from '../lib/supabase';

import { useTheme } from '../context/ThemeContext';

const RETENTION_OPTIONS = [
  1,
  2,
  3,
  6,
  12,
  24,
];

const PAYMENT_OPTIONS = [
  'pending',
  'partial',
  'paid',
];

const STATUS_OPTIONS = [
  {
    value: 'reserved',
    label: 'Reserved',
  },
  {
    value: 'checked_in',
    label: 'Check In Now',
  },
];

function formatDate(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(dateString) {
  if (!dateString) return '—';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function addMonths(date, months) {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months
  );

  return result;
}

function generateBookingReference() {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  const random = Math.random()
    .toString(36)
    .substring(2, 6)
    .toUpperCase();

  return `SEC-${year}${month}${day}-${random}`;
}

function getGuestName(guest) {
  const first = guest.first_name || '';
  const last = guest.last_name || '';

  const name =
    `${first} ${last}`.trim();

  return name || 'Unnamed Guest';
}

function getDaysRemaining(dateString) {
  if (!dateString) return null;

  const target = new Date(dateString);
  const now = new Date();

  const difference =
    target.getTime() -
    now.getTime();

  return Math.ceil(
    difference /
      (1000 * 60 * 60 * 24)
  );
}

export default function GuestsScreen() {
  const {
    colors,
    isDark,
  } = useTheme();

  const styles = useMemo(
    () =>
      createStyles(
        colors,
        isDark
      ),
    [colors, isDark]
  );

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [guests, setGuests] =
    useState([]);

  const [properties, setProperties] =
    useState([]);

  const [units, setUnits] =
    useState([]);

  const [
    selectedSection,
    setSelectedSection,
  ] = useState('current');

  const [
    drawerVisible,
    setDrawerVisible,
  ] = useState(false);

  const [
    registerVisible,
    setRegisterVisible,
  ] = useState(false);

  const [
    propertyPickerVisible,
    setPropertyPickerVisible,
  ] = useState(false);

  const [
    unitPickerVisible,
    setUnitPickerVisible,
  ] = useState(false);

  const [
    paymentPickerVisible,
    setPaymentPickerVisible,
  ] = useState(false);

  const [
    statusPickerVisible,
    setStatusPickerVisible,
  ] = useState(false);

  const [
    retentionVisible,
    setRetentionVisible,
  ] = useState(false);

  const [
    retentionMonths,
    setRetentionMonths,
  ] = useState(1);

  const [
    savingRetention,
    setSavingRetention,
  ] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    propertyId: '',
    unitId: '',
    checkIn: '',
    checkOut: '',
    paymentStatus: 'pending',
    status: 'reserved',
    notes: '',
  });

  const [
    selectedPropertyName,
    setSelectedPropertyName,
  ] = useState('');

  const [
    selectedUnitName,
    setSelectedUnitName,
  ] = useState('');

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  useEffect(() => {
    loadData();
    loadRetentionSetting();

    const channel = supabase
      .channel(
        'guests-screen-realtime'
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests',
        },
        () => {
          loadGuests();
        }
      )
      .subscribe(
        (status, error) => {
          console.log(
            'Guests realtime status:',
            status,
            error || ''
          );
        }
      );

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, []);

  async function loadData() {
    setLoading(true);

    await loadGuests();

    setLoading(false);

    loadProperties();
    loadUnits();
  }

  async function loadGuests() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from('guests')
        .select('*')
        .order(
          'created_at',
          {
            ascending: false,
          }
        );

      if (error) {
        console.error(
          'Load guests error:',
          error
        );

        setErrorMessage(
          getSupabaseErrorMessage(
            error
          )
        );

        setGuests([]);

        return;
      }

      setGuests(data || []);
      setErrorMessage('');
    } catch (error) {
      console.error(
        'Unexpected load guests error:',
        error
      );

      setGuests([]);

      setErrorMessage(
        getSupabaseErrorMessage(
          error
        )
      );
    }
  }

  async function loadProperties() {
    const {
      data,
      error,
    } = await supabase
      .from('properties')
      .select(
        'id, name, address'
      )
      .order('name', {
        ascending: true,
      });

    if (error) {
      console.error(
        'Load properties error:',
        error
      );

      return;
    }

    setProperties(data || []);
  }

  async function loadUnits() {
    const {
      data,
      error,
    } = await supabase
      .from('property_units')
      .select('*')
      .order(
        'created_at',
        {
          ascending: true,
        }
      );

    if (error) {
      console.error(
        'Load units error:',
        error
      );

      return;
    }

    setUnits(data || []);
  }

  async function loadRetentionSetting() {
    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) return;

    const {
      data,
      error,
    } = await supabase
      .from('admin_settings')
      .select(
        'guest_data_retention_months'
      )
      .eq(
        'admin_id',
        user.id
      )
      .maybeSingle();

    if (error) {
      console.error(
        'Load retention setting error:',
        error
      );

      return;
    }

    if (
      data?.guest_data_retention_months
    ) {
      setRetentionMonths(
        Math.max(
          1,
          Number(
            data.guest_data_retention_months
          )
        )
      );
    }
  }

  async function saveRetention(
    months
  ) {
    const safeMonths =
      Math.max(
        1,
        Number(months)
      );

    setSavingRetention(true);

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'You are not logged in.'
        );
      }

      const {
        error,
      } = await supabase
        .from('admin_settings')
        .upsert(
          {
            admin_id: user.id,
            guest_data_retention_months:
              safeMonths,
          },
          {
            onConflict:
              'admin_id',
          }
        );

      if (error) {
        console.error(
          'Save retention error:',
          error
        );

        throw error;
      }

      setRetentionMonths(
        safeMonths
      );

      setRetentionVisible(
        false
      );

      Alert.alert(
        'Retention Updated',
        `Checked-out guest records will be retained for ${safeMonths} month${
          safeMonths === 1
            ? ''
            : 's'
        }.`
      );
    } catch (error) {
      Alert.alert(
        'Unable to Save',
        getSupabaseErrorMessage(
          error
        )
      );
    } finally {
      setSavingRetention(
        false
      );
    }
  }

  function resetForm() {
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      propertyId: '',
      unitId: '',
      checkIn: '',
      checkOut: '',
      paymentStatus:
        'pending',
      status: 'reserved',
      notes: '',
    });

    setSelectedPropertyName(
      ''
    );

    setSelectedUnitName(
      ''
    );

    setErrorMessage('');
  }

  function openRegistration() {
    resetForm();

    setRegisterVisible(
      true
    );
  }

  function updateForm(
    field,
    value
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectProperty(
    property
  ) {
    updateForm(
      'propertyId',
      property.id
    );

    updateForm(
      'unitId',
      ''
    );

    setSelectedPropertyName(
      property.name ||
        property.address ||
        'Property'
    );

    setSelectedUnitName('');

    setPropertyPickerVisible(
      false
    );
  }

  function selectUnit(unit) {
    updateForm(
      'unitId',
      unit.id
    );

    setSelectedUnitName(
      unit.name ||
        unit.unit_name ||
        unit.unit_number ||
        unit.number ||
        `Unit ${
          unit.id?.slice(
            0,
            6
          ) || ''
        }`
    );

    setUnitPickerVisible(
      false
    );
  }

  const availableUnits =
    useMemo(() => {
      if (!form.propertyId) {
        return [];
      }

      return units.filter(
        (unit) =>
          unit.property_id ===
          form.propertyId
      );
    }, [
      units,
      form.propertyId,
    ]);

  async function registerGuest() {
    setErrorMessage('');

    if (!form.firstName.trim()) {
      Alert.alert(
        'Missing Information',
        'Enter the guest first name.'
      );
      return;
    }

    if (!form.lastName.trim()) {
      Alert.alert(
        'Missing Information',
        'Enter the guest last name.'
      );
      return;
    }

    if (!form.propertyId) {
      Alert.alert(
        'Missing Property',
        'Please select a property.'
      );
      return;
    }

    if (!form.checkIn.trim()) {
      Alert.alert(
        'Missing Check-in',
        'Enter a check-in date.'
      );
      return;
    }

    if (!form.checkOut.trim()) {
      Alert.alert(
        'Missing Check-out',
        'Enter a check-out date.'
      );
      return;
    }

    const checkInDate = new Date(
      form.checkIn
    );

    const checkOutDate = new Date(
      form.checkOut
    );

    if (
      Number.isNaN(
        checkInDate.getTime()
      ) ||
      Number.isNaN(
        checkOutDate.getTime()
      )
    ) {
      Alert.alert(
        'Invalid Date',
        'Use the format YYYY-MM-DD.'
      );
      return;
    }

    if (checkOutDate <= checkInDate) {
      Alert.alert(
        'Invalid Dates',
        'Check-out must be after check-in.'
      );
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'You are not logged in.'
        );
      }

      const bookingReference =
        generateBookingReference();

      const now =
        new Date().toISOString();

      const isCheckedIn =
        form.status === 'checked_in';

      const {
        data,
        error,
      } = await supabase
        .from('guests')
        .insert({
          property_id:
            form.propertyId || null,

          unit_id:
            form.unitId || null,

          created_by:
            user.id,

          first_name:
            form.firstName.trim(),

          last_name:
            form.lastName.trim(),

          email:
            form.email.trim() || null,

          phone:
            form.phone.trim() || null,

          address:
            form.address.trim() || null,

          booking_reference:
            bookingReference,

          check_in:
            checkInDate.toISOString(),

          check_out:
            checkOutDate.toISOString(),

          payment_status:
            form.paymentStatus,

          status:
            form.status,

          notes:
            form.notes.trim() || null,

          check_in_date:
            isCheckedIn
              ? now
              : checkInDate.toISOString(),

          check_out_date:
            checkOutDate.toISOString(),

          archived_at: null,

          deletion_scheduled_at:
            null,
        })
        .select()
        .single();

      if (error) {
        console.error(
          'Register guest error:',
          error
        );

        throw error;
      }

      setGuests((current) => [
        data,
        ...current.filter(
          (guest) =>
            guest.id !== data.id
        ),
      ]);

      setRegisterVisible(false);

      resetForm();

      Alert.alert(
        'Guest Registered',
        `${getGuestName(
          data
        )} has been registered.\n\nBooking Reference:\n${bookingReference}`
      );
    } catch (error) {
      console.error(error);

      Alert.alert(
        'Registration Failed',
        getSupabaseErrorMessage(
          error
        )
      );
    } finally {
      setSaving(false);
    }
  }

  function checkoutGuest(guest) {
    Alert.alert(
      'Check Out Guest',
      `Check out ${getGuestName(
        guest
      )}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Check Out',
          onPress: () =>
            performCheckout(guest),
        },
      ]
    );
  }

  async function performCheckout(
    guest
  ) {
    try {
      const checkoutDate =
        new Date();

      const deletionDate =
        addMonths(
          checkoutDate,
          Math.max(
            1,
            retentionMonths
          )
        );

      const {
        data,
        error,
      } = await supabase
        .from('guests')
        .update({
          status:
            'checked_out',

          check_out_date:
            checkoutDate.toISOString(),

          archived_at:
            checkoutDate.toISOString(),

          deletion_scheduled_at:
            deletionDate.toISOString(),

          updated_at:
            checkoutDate.toISOString(),
        })
        .eq('id', guest.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      setGuests((current) =>
        current.map((item) =>
          item.id === guest.id
            ? data
            : item
        )
      );

      Alert.alert(
        'Guest Checked Out',
        `${getGuestName(
          guest
        )} has been checked out.\n\nRecord retention: ${retentionMonths} month${
          retentionMonths === 1
            ? ''
            : 's'
        }.`
      );
    } catch (error) {
      console.error(
        'Checkout guest error:',
        error
      );

      Alert.alert(
        'Checkout Failed',
        getSupabaseErrorMessage(
          error
        )
      );
    }
  }

  const checkedInGuests =
    guests.filter(
      (guest) =>
        guest.status ===
          'checked_in' ||
        guest.status ===
          'reserved'
    );

  const checkedOutGuests =
    guests.filter(
      (guest) =>
        guest.status ===
        'checked_out'
    );

  const displayedGuests =
    selectedSection === 'current'
      ? checkedInGuests
      : checkedOutGuests;

  function getPropertyName(
    propertyId
  ) {
    const property =
      properties.find(
        (item) =>
          item.id === propertyId
      );

    return (
      property?.name ||
      property?.address ||
      'Unknown Property'
    );
  }

  function getUnitName(unitId) {
    const unit =
      units.find(
        (item) =>
          item.id === unitId
      );

    if (!unit) return '';

    return (
      unit.name ||
      unit.unit_name ||
      unit.unit_number ||
      unit.number ||
      'Unit'
    );
  }

  function renderGuest({ item }) {
    const daysRemaining =
      getDaysRemaining(
        item.deletion_scheduled_at
      );

    const isReserved =
      item.status ===
      'reserved';

    return (
      <View
        style={styles.guestCard}
      >
        <View
          style={styles.guestTop}
        >
          <View
            style={styles.avatar}
          >
            <Text
              style={
                styles.avatarText
              }
            >
              {(
                item.first_name?.[0] ||
                '?'
              ).toUpperCase()}
            </Text>
          </View>

          <View
            style={styles.guestMain}
          >
            <Text
              style={styles.guestName}
            >
              {getGuestName(item)}
            </Text>

            <Text
              style={
                styles.bookingReference
              }
            >
              {item.booking_reference ||
                'No booking reference'}
            </Text>

            <View
              style={
                styles.statusRow
              }
            >
              <View
                style={[
                  styles.statusBadge,
                  isReserved
                    ? styles.reservedBadge
                    : styles.checkedBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    isReserved
                      ? styles.reservedText
                      : styles.checkedText,
                  ]}
                >
                  {isReserved
                    ? 'RESERVED'
                    : 'CHECKED IN'}
                </Text>
              </View>

              <View
                style={
                  styles.paymentBadge
                }
              >
                <Text
                  style={
                    styles.paymentText
                  }
                >
                  {(
                    item.payment_status ||
                    'pending'
                  ).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View
          style={styles.infoBlock}
        >
          <InfoRow
            icon="business-outline"
            text={getPropertyName(
              item.property_id
            )}
          />

          {item.unit_id ? (
            <InfoRow
              icon="bed-outline"
              text={getUnitName(
                item.unit_id
              )}
            />
          ) : null}

          {item.phone ? (
            <InfoRow
              icon="call-outline"
              text={item.phone}
            />
          ) : null}

          {item.email ? (
            <InfoRow
              icon="mail-outline"
              text={item.email}
            />
          ) : null}

          <InfoRow
            icon="calendar-outline"
            text={`${formatDate(
              item.check_in
            )} → ${formatDate(
              item.check_out
            )}`}
          />
        </View>

        {item.status !==
        'checked_out' ? (
          <Pressable
            style={
              styles.checkoutButton
            }
            onPress={() =>
              checkoutGuest(item)
            }
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color={
                colors.primary
              }
            />

            <Text
              style={
                styles.checkoutText
              }
            >
              Check Out
            </Text>
          </Pressable>
        ) : null}

        {item.status ===
        'checked_out' ? (
          <View
            style={
              styles.retentionInfo
            }
          >
            <Ionicons
              name="time-outline"
              size={17}
              color={
                colors.primary
              }
            />

            <View
              style={{
                flex: 1,
              }}
            >
              <Text
                style={
                  styles.retentionTitle
                }
              >
                Data retention
              </Text>

              <Text
                style={
                  styles.retentionText
                }
              >
                {daysRemaining !==
                  null &&
                daysRemaining > 0
                  ? `${daysRemaining} day${
                      daysRemaining ===
                      1
                        ? ''
                        : 's'
                    } remaining`
                  : 'Eligible for deletion'}
              </Text>
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={
              selectedSection === 'current'
                ? 'people-outline'
                : 'archive-outline'
            }
            size={36}
            color={colors.primary}
          />
        </View>

        <Text style={styles.emptyTitle}>
          {selectedSection === 'current'
            ? 'No Guests Yet'
            : 'No Checked-Out Guests'}
        </Text>

        <Text style={styles.emptyText}>
          {selectedSection === 'current'
            ? 'Register a guest or create a booking to get started.'
            : 'Checked-out guest records will appear here.'}
        </Text>

        {selectedSection === 'current' ? (
          <Pressable
            style={styles.emptyButton}
            onPress={openRegistration}
          >
            <Ionicons
              name="add"
              size={20}
              color="#fff"
            />

            <Text
              style={
                styles.emptyButtonText
              }
            >
              Register Guest
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function renderRegisterModal() {
    return (
      <Modal
        visible={registerVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setRegisterVisible(false)
        }
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
        >
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  Register Guest
                </Text>

                <Text style={styles.modalSubtitle}>
                  Create a guest booking
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setRegisterVisible(false)
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.sectionLabel}>
                GUEST INFORMATION
              </Text>

              <View style={styles.twoColumns}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="First Name *"
                    value={form.firstName}
                    onChangeText={(value) =>
                      updateForm(
                        'firstName',
                        value
                      )
                    }
                    placeholder="First name"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Field
                    label="Last Name *"
                    value={form.lastName}
                    onChangeText={(value) =>
                      updateForm(
                        'lastName',
                        value
                      )
                    }
                    placeholder="Last name"
                  />
                </View>
              </View>

              <Field
                label="Email"
                value={form.email}
                onChangeText={(value) =>
                  updateForm(
                    'email',
                    value
                  )
                }
                placeholder="guest@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Field
                label="Phone"
                value={form.phone}
                onChangeText={(value) =>
                  updateForm(
                    'phone',
                    value
                  )
                }
                placeholder="09XXXXXXXXX"
                keyboardType="phone-pad"
              />

              <Field
                label="Address"
                value={form.address}
                onChangeText={(value) =>
                  updateForm(
                    'address',
                    value
                  )
                }
                placeholder="Guest address"
                multiline
              />

              <Text style={styles.sectionLabel}>
                BOOKING
              </Text>

              <SelectField
                label="Property *"
                value={
                  selectedPropertyName ||
                  'Select property'
                }
                onPress={() =>
                  setPropertyPickerVisible(
                    true
                  )
                }
              />

              <SelectField
                label="Room / Unit"
                value={
                  selectedUnitName ||
                  'Select room / unit'
                }
                onPress={() => {
                  if (!form.propertyId) {
                    Alert.alert(
                      'Select Property',
                      'Please select a property first.'
                    );
                    return;
                  }

                  setUnitPickerVisible(
                    true
                  );
                }}
              />

              <Field
                label="Check-in Date *"
                value={form.checkIn}
                onChangeText={(value) =>
                  updateForm(
                    'checkIn',
                    value
                  )
                }
                placeholder="YYYY-MM-DD"
              />

              <Field
                label="Check-out Date *"
                value={form.checkOut}
                onChangeText={(value) =>
                  updateForm(
                    'checkOut',
                    value
                  )
                }
                placeholder="YYYY-MM-DD"
              />

              <SelectField
                label="Booking Status"
                value={
                  STATUS_OPTIONS.find(
                    (item) =>
                      item.value ===
                      form.status
                  )?.label ||
                  'Select status'
                }
                onPress={() =>
                  setStatusPickerVisible(
                    true
                  )
                }
              />

              <SelectField
                label="Payment Status"
                value={
                  form.paymentStatus
                    .charAt(0)
                    .toUpperCase() +
                  form.paymentStatus.slice(1)
                }
                onPress={() =>
                  setPaymentPickerVisible(
                    true
                  )
                }
              />

              <Field
                label="Notes"
                value={form.notes}
                onChangeText={(value) =>
                  updateForm(
                    'notes',
                    value
                  )
                }
                placeholder="Additional notes"
                multiline
              />

              <View
                style={
                  styles.referencePreview
                }
              >
                <Ionicons
                  name="ticket-outline"
                  size={20}
                  color={colors.primary}
                />

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.referenceLabel
                    }
                  >
                    Booking reference
                  </Text>

                  <Text
                    style={
                      styles.referenceValue
                    }
                  >
                    Generated automatically
                  </Text>
                </View>
              </View>

              <Pressable
                style={[
                  styles.registerButton,
                  saving &&
                    styles.disabledButton,
                ]}
                onPress={registerGuest}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color="#fff"
                    />

                    <Text
                      style={
                        styles.registerButtonText
                      }
                    >
                      Register Guest
                    </Text>
                  </>
                )}
              </Pressable>

              <View
                style={{
                  height: 30,
                }}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  function renderSelectionModal(
    visible,
    title,
    data,
    onClose,
    onSelect,
    emptyText
  ) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectionModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {title}
              </Text>

              <Pressable
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </Pressable>
            </View>

            {data.length === 0 ? (
              <View
                style={
                  styles.selectionEmpty
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={35}
                  color={colors.muted}
                />

                <Text
                  style={
                    styles.selectionEmptyText
                  }
                >
                  {emptyText}
                </Text>
              </View>
            ) : (
              <FlatList
                data={data}
                keyExtractor={(item) =>
                  String(item.id)
                }
                showsVerticalScrollIndicator={
                  false
                }
                renderItem={({
                  item,
                }) => (
                  <Pressable
                    style={
                      styles.selectionItem
                    }
                    onPress={() =>
                      onSelect(item)
                    }
                  >
                    <View
                      style={
                        styles.selectionIcon
                      }
                    >
                      <Ionicons
                        name="business-outline"
                        size={20}
                        color={
                          colors.primary
                        }
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.selectionTitle
                        }
                      >
                        {item.name ||
                          item.unit_name ||
                          item.unit_number ||
                          item.number ||
                          'Unnamed'}
                      </Text>

                      {item.address ? (
                        <Text
                          style={
                            styles.selectionSubtitle
                          }
                        >
                          {item.address}
                        </Text>
                      ) : null}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={
                        colors.muted
                      }
                    />
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    );
  }

  function renderSimplePicker(
    visible,
    title,
    options,
    selectedValue,
    onSelect,
    onClose
  ) {
    return (
      <Modal
        visible={visible}
        animationType="fade"
        transparent
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallPicker}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {title}
              </Text>

              <Pressable
                onPress={onClose}
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </Pressable>
            </View>

            {options.map((option) => {
              const value =
                typeof option === 'string'
                  ? option
                  : option.value;

              const label =
                typeof option === 'string'
                  ? option
                      .charAt(0)
                      .toUpperCase() +
                    option.slice(1)
                  : option.label;

              const selected =
                selectedValue === value;

              return (
                <Pressable
                  key={value}
                  style={[
                    styles.pickerOption,
                    selected &&
                      styles.selectedPickerOption,
                  ]}
                  onPress={() => {
                    onSelect(value);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selected &&
                        styles.selectedPickerText,
                    ]}
                  >
                    {label}
                  </Text>

                  {selected ? (
                    <Ionicons
                      name="checkmark"
                      size={21}
                      color={
                        colors.primary
                      }
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    );
  }

  function renderRetentionModal() {
    return (
      <Modal
        visible={retentionVisible}
        animationType="fade"
        transparent
        onRequestClose={() =>
          setRetentionVisible(false)
        }
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallPicker}>
            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={styles.modalTitle}
                >
                  Data Retention
                </Text>

                <Text
                  style={
                    styles.modalSubtitle
                  }
                >
                  Minimum retention is 1 month.
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setRetentionVisible(
                    false
                  )
                }
                style={styles.closeButton}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={colors.text}
                />
              </Pressable>
            </View>

            {RETENTION_OPTIONS.map(
              (months) => {
                const selected =
                  retentionMonths ===
                  months;

                return (
                  <Pressable
                    key={months}
                    style={[
                      styles.pickerOption,
                      selected &&
                        styles.selectedPickerOption,
                    ]}
                    onPress={() =>
                      saveRetention(
                        months
                      )
                    }
                    disabled={
                      savingRetention
                    }
                  >
                    <View>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          selected &&
                            styles.selectedPickerText,
                        ]}
                      >
                        {months} Month
                        {months === 1
                          ? ''
                          : 's'}
                      </Text>

                      {months === 1 ? (
                        <Text
                          style={
                            styles.optionHint
                          }
                        >
                          Minimum allowed
                        </Text>
                      ) : null}
                    </View>

                    {selected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={
                          colors.primary
                        }
                      />
                    ) : null}
                  </Pressable>
                );
              }
            )}
          </View>
        </View>
      </Modal>
    );
  }

  function renderDrawer() {
    return (
      <Modal
        visible={drawerVisible}
        animationType="slide"
        transparent
        onRequestClose={() =>
          setDrawerVisible(false)
        }
      >
        <View style={styles.drawerOverlay}>
          <Pressable
            style={styles.drawerBackdrop}
            onPress={() =>
              setDrawerVisible(false)
            }
          />

          <View style={styles.drawer}>
            <View
              style={
                styles.drawerHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.drawerTitle
                  }
                >
                  Guests
                </Text>

                <Text
                  style={
                    styles.drawerSubtitle
                  }
                >
                  Manage guest bookings
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setDrawerVisible(false)
                }
              >
                <Ionicons
                  name="close"
                  size={25}
                  color={colors.text}
                />
              </Pressable>
            </View>

            <DrawerItem
              icon="people-outline"
              title="Currently Checked In"
              active={
                selectedSection ===
                'current'
              }
              onPress={() => {
                setSelectedSection(
                  'current'
                );

                setDrawerVisible(
                  false
                );
              }}
            />

            <DrawerItem
              icon="archive-outline"
              title="Recently Checked Out"
              active={
                selectedSection ===
                'history'
              }
              onPress={() => {
                setSelectedSection(
                  'history'
                );

                setDrawerVisible(
                  false
                );
              }}
            />

            <View
              style={
                styles.drawerDivider
              }
            />

            <DrawerItem
              icon="time-outline"
              title="Data Retention"
              onPress={() => {
                setDrawerVisible(
                  false
                );

                setRetentionVisible(
                  true
                );
              }}
            />

            <View
              style={
                styles.drawerRetention
              }
            >
              <Text
                style={
                  styles.drawerRetentionLabel
                }
              >
                Current retention
              </Text>

              <Text
                style={
                  styles.drawerRetentionValue
                }
              >
                {retentionMonths} month
                {retentionMonths === 1
                  ? ''
                  : 's'}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // ============================================================
  // MAIN SCREEN
  // ============================================================

  return (
    <View style={styles.container}>

      <View style={styles.header}>

        <Pressable
          style={styles.headerIconButton}
          onPress={() =>
            setDrawerVisible(true)
          }
        >
          <Ionicons
            name="menu-outline"
            size={24}
            color={colors.text}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            Guests
          </Text>

          <Text style={styles.subtitle}>
            Manage guest bookings and stays
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={openRegistration}
        >
          <Ionicons
            name="add"
            size={25}
            color="#fff"
          />
        </Pressable>

      </View>

      <View style={styles.quickStats}>

        <View style={styles.statCard}>
          <Ionicons
            name="people-outline"
            size={22}
            color={colors.primary}
          />

          <View>
            <Text style={styles.statValue}>
              {checkedInGuests.length}
            </Text>

            <Text style={styles.statLabel}>
              Current Guests
            </Text>
          </View>
        </View>

        <View style={styles.statCard}>
          <Ionicons
            name="archive-outline"
            size={22}
            color={colors.primary}
          />

          <View>
            <Text style={styles.statValue}>
              {checkedOutGuests.length}
            </Text>

            <Text style={styles.statLabel}>
              Checked Out
            </Text>
          </View>
        </View>

      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Ionicons
            name="alert-circle-outline"
            size={20}
            color={
              colors.danger ||
              '#d32f2f'
            }
          />

          <Text style={styles.errorText}>
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />

          <Text style={styles.loadingText}>
            Loading guests...
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedGuests}
          keyExtractor={(item) =>
            String(item.id)
          }
          renderItem={renderGuest}
          contentContainerStyle={
            displayedGuests.length === 0
              ? styles.emptyContainer
              : styles.list
          }
          showsVerticalScrollIndicator={
            false
          }
          ListEmptyComponent={
            renderEmpty
          }
          refreshing={loading}
          onRefresh={loadGuests}
        />
      )}

      {renderRegisterModal()}

      {renderSelectionModal(
        propertyPickerVisible,
        'Select Property',
        properties,
        () =>
          setPropertyPickerVisible(
            false
          ),
        selectProperty,
        'No properties available.'
      )}

      {renderSelectionModal(
        unitPickerVisible,
        'Select Room / Unit',
        availableUnits,
        () =>
          setUnitPickerVisible(
            false
          ),
        selectUnit,
        'No rooms or units are available for this property.'
      )}

      {renderSimplePicker(
        paymentPickerVisible,
        'Payment Status',
        PAYMENT_OPTIONS,
        form.paymentStatus,
        (value) =>
          updateForm(
            'paymentStatus',
            value
          ),
        () =>
          setPaymentPickerVisible(
            false
          )
      )}

      {renderSimplePicker(
        statusPickerVisible,
        'Booking Status',
        STATUS_OPTIONS,
        form.status,
        (value) =>
          updateForm(
            'status',
            value
          ),
        () =>
          setStatusPickerVisible(
            false
          )
      )}

      {renderRetentionModal()}

      {renderDrawer()}

    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  multiline,
}) {
  const { colors } = useTheme();

  return (
    <View style={{ marginBottom: 15 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={
          keyboardType || 'default'
        }
        autoCapitalize={
          autoCapitalize || 'sentences'
        }
        multiline={multiline}
        numberOfLines={
          multiline ? 4 : 1
        }
        style={{
          backgroundColor:
            colors.inputBackground ||
            colors.card,
          borderWidth: 1,
          borderColor:
            colors.border ||
            '#ddd',
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical:
            multiline ? 12 : 11,
          minHeight: multiline
            ? 90
            : 45,
          color: colors.text,
          textAlignVertical:
            multiline
              ? 'top'
              : 'center',
        }}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  onPress,
}) {
  const { colors } = useTheme();

  return (
    <View style={{ marginBottom: 15 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          color: colors.text,
          marginBottom: 7,
        }}
      >
        {label}
      </Text>

      <Pressable
        style={{
          minHeight: 45,
          borderWidth: 1,
          borderColor:
            colors.border ||
            '#ddd',
          borderRadius: 12,
          backgroundColor:
            colors.inputBackground ||
            colors.card,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={onPress}
      >
        <Text
          style={{
            flex: 1,
            color:
              value.startsWith('Select')
                ? colors.muted
                : colors.text,
            fontSize: 14,
          }}
        >
          {value}
        </Text>

        <Ionicons
          name="chevron-down"
          size={19}
          color={colors.muted}
        />
      </Pressable>
    </View>
  );
}

function InfoRow({
  icon,
  text,
}) {
  const { colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 7,
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={colors.muted}
        style={{
          marginRight: 8,
        }}
      />

      <Text
        style={{
          flex: 1,
          fontSize: 13,
          color:
            colors.secondaryText,
        }}
        numberOfLines={2}
      >
        {text}
      </Text>
    </View>
  );
}

function DrawerItem({
  icon,
  title,
  active,
  onPress,
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: active
          ? colors.primary + '18'
          : 'transparent',
      }}
    >
      <Ionicons
        name={icon}
        size={22}
        color={
          active
            ? colors.primary
            : colors.text
        }
      />

      <Text
        style={{
          marginLeft: 13,
          fontSize: 15,
          fontWeight: active
            ? '700'
            : '500',
          color: active
            ? colors.primary
            : colors.text,
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}

function createStyles(
  colors,
  isDark
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    header: {
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
    },

    title: {
      fontSize: 27,
      fontWeight: '800',
      color: colors.text,
    },

    subtitle: {
      marginTop: 3,
      fontSize: 13,
      color: colors.secondaryText,
    },

    headerIconButton: {
      width: 43,
      height: 43,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 9,
    },

    addButton: {
      width: 43,
      height: 43,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },

    quickStats: {
      flexDirection: 'row',
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 10,
    },

    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    statValue: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
    },

    statLabel: {
      fontSize: 11,
      color: colors.secondaryText,
      marginTop: 1,
    },

    list: {
      padding: 20,
      paddingTop: 8,
      paddingBottom: 100,
    },

    guestCard: {
      backgroundColor: colors.card,
      borderRadius: 17,
      padding: 16,
      marginBottom: 13,
      borderWidth: 1,
      borderColor: colors.border,
    },

    guestTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    avatar: {
      width: 48,
      height: 48,
      borderRadius: 15,
      backgroundColor:
        colors.primary + '18',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    avatarText: {
      color: colors.primary,
      fontSize: 19,
      fontWeight: '800',
    },

    guestMain: {
      flex: 1,
    },

    guestName: {
      fontSize: 17,
      fontWeight: '800',
      color: colors.text,
    },

    bookingReference: {
      fontSize: 12,
      color: colors.secondaryText,
      marginTop: 3,
    },

    statusRow: {
      flexDirection: 'row',
      marginTop: 8,
      gap: 7,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 7,
    },

    checkedBadge: {
      backgroundColor: '#2e7d3218',
    },

    reservedBadge: {
      backgroundColor: '#f59e0b18',
    },

    statusText: {
      fontSize: 9,
      fontWeight: '800',
    },

    checkedText: {
      color: '#2e7d32',
    },

    reservedText: {
      color: '#d97706',
    },

    paymentBadge: {
      backgroundColor:
        colors.secondaryBackground ||
        colors.background,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 7,
    },

    paymentText: {
      color: colors.secondaryText,
      fontSize: 9,
      fontWeight: '800',
    },

    infoBlock: {
      marginTop: 15,
      paddingTop: 13,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },

    checkoutButton: {
      height: 43,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 7,
      marginTop: 7,
    },

    checkoutText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: 13,
    },

    retentionInfo: {
      marginTop: 12,
      padding: 11,
      borderRadius: 11,
      backgroundColor:
        colors.primary + '10',
      flexDirection: 'row',
      gap: 9,
      alignItems: 'center',
    },

    retentionTitle: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },

    retentionText: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: 2,
    },

    emptyContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 25,
    },

    empty: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor:
        colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 17,
    },

    emptyTitle: {
      fontSize: 19,
      fontWeight: '800',
      color: colors.text,
    },

    emptyText: {
      textAlign: 'center',
      fontSize: 13,
      lineHeight: 20,
      color: colors.secondaryText,
      marginTop: 7,
      maxWidth: 300,
    },

    emptyButton: {
      marginTop: 18,
      backgroundColor: colors.primary,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },

    emptyButtonText: {
      color: '#fff',
      fontWeight: '700',
    },

    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      color: colors.secondaryText,
      marginTop: 10,
      fontSize: 13,
    },

    errorBox: {
      marginHorizontal: 20,
      marginBottom: 10,
      padding: 12,
      borderRadius: 11,
      backgroundColor:
        (colors.danger ||
          '#d32f2f') + '12',
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },

    errorText: {
      flex: 1,
      color: colors.text,
      fontSize: 12,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },

    formModal: {
      backgroundColor:
        colors.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      maxHeight: '94%',
      paddingHorizontal: 20,
      paddingTop: 18,
    },

    selectionModal: {
      backgroundColor:
        colors.background,
      borderTopLeftRadius: 25,
      borderTopRightRadius: 25,
      maxHeight: '75%',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 20,
    },

    smallPicker: {
      backgroundColor:
        colors.background,
      borderRadius: 22,
      margin: 20,
      padding: 18,
    },

    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    },

    modalTitle: {
      color: colors.text,
      fontSize: 21,
      fontWeight: '800',
    },

    modalSubtitle: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 3,
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },

    sectionLabel: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.7,
      marginBottom: 13,
      marginTop: 3,
    },

    twoColumns: {
      flexDirection: 'row',
      gap: 10,
    },

    referencePreview: {
      borderRadius: 13,
      backgroundColor:
        colors.primary + '10',
      padding: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginBottom: 15,
    },

    referenceLabel: {
      fontSize: 11,
      color: colors.secondaryText,
    },

    referenceValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
    },

    registerButton: {
      height: 50,
      backgroundColor: colors.primary,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },

    registerButtonText: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },

    disabledButton: {
      opacity: 0.65,
    },

    selectionItem: {
      minHeight: 65,
      borderRadius: 13,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      marginBottom: 9,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 11,
    },

    selectionIcon: {
      width: 39,
      height: 39,
      borderRadius: 11,
      backgroundColor:
        colors.primary + '12',
      alignItems: 'center',
      justifyContent: 'center',
    },

    selectionTitle: {
      color: colors.text,
      fontWeight: '700',
      fontSize: 14,
    },

    selectionSubtitle: {
      color: colors.secondaryText,
      fontSize: 11,
      marginTop: 2,
    },

    selectionEmpty: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 45,
    },

    selectionEmptyText: {
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 10,
      fontSize: 13,
    },

    pickerOption: {
      minHeight: 52,
      borderRadius: 11,
      paddingHorizontal: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 5,
    },

    selectedPickerOption: {
      backgroundColor:
        colors.primary + '12',
    },

    pickerOptionText: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },

    selectedPickerText: {
      color: colors.primary,
      fontWeight: '800',
    },

    optionHint: {
      color: colors.secondaryText,
      fontSize: 10,
      marginTop: 2,
    },

    drawerOverlay: {
      flex: 1,
      flexDirection: 'row',
    },

    drawerBackdrop: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.45)',
    },

    drawer: {
      width: '82%',
      backgroundColor:
        colors.background,
      padding: 20,
      paddingTop: 55,
    },

    drawerHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 25,
    },

    drawerTitle: {
      color: colors.text,
      fontSize: 23,
      fontWeight: '800',
    },

    drawerSubtitle: {
      color: colors.secondaryText,
      fontSize: 12,
      marginTop: 3,
    },

    drawerDivider: {
      height: 1,
      backgroundColor:
        colors.border,
      marginVertical: 14,
    },

    drawerRetention: {
      marginTop: 15,
      padding: 13,
      borderRadius: 12,
      backgroundColor: colors.card,
    },

    drawerRetentionLabel: {
      color: colors.secondaryText,
      fontSize: 11,
    },

    drawerRetentionValue: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 3,
    },
  });
}
