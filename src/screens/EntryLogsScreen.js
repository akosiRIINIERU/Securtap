
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const FILTERS = ['All', 'Granted', 'Denied'];

export default function EntryLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [error, setError] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setError('');

      const { data, error: queryError } = await supabase
        .from('entry_logs')
        .select(
          'id, guest_name, event_type, access_method, result, event_time, lock_device_id, property_id'
        )
        .order('event_time', { ascending: false })
        .limit(200);

      if (queryError) throw queryError;

      setLogs(data || []);
    } catch (err) {
      console.error('Entry logs error:', err.message);
      setError(err.message || 'Unable to load entry logs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();

    const channel = supabase
      .channel('entry-logs-screen')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entry_logs',
        },
        () => {
          loadLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadLogs]);

  const refresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const isGranted = (result) => {
    const value = String(result || '').toLowerCase();
    return [
      'granted',
      'success',
      'successful',
      'allowed',
      'unlocked',
      'approved',
    ].includes(value);
  };

  const isDenied = (result) => {
    const value = String(result || '').toLowerCase();
    return [
      'denied',
      'failed',
      'failure',
      'rejected',
      'unauthorized',
    ].includes(value);
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      const granted = isGranted(item.result);
      const denied = isDenied(item.result);

      if (activeFilter === 'Granted' && !granted) return false;
      if (activeFilter === 'Denied' && !denied) return false;

      const searchText = [
        item.guest_name,
        item.event_type,
        item.access_method,
        item.result,
        item.lock_device_id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchText.includes(search.trim().toLowerCase());
    });
  }, [logs, search, activeFilter]);

  const grantedCount = logs.filter((item) =>
    isGranted(item.result)
  ).length;

  const deniedCount = logs.filter((item) =>
    isDenied(item.result)
  ).length;

  const formatDate = (value) => {
    if (!value) return 'Date unavailable';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Date unavailable';
    }

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (value) => {
    if (!value) return 'Time unavailable';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return 'Time unavailable';
    }

    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatLabel = (value) => {
    if (!value) return 'Unknown';

    return String(value)
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  const renderLog = ({ item }) => {
    const granted = isGranted(item.result);
    const denied = isDenied(item.result);

    const statusLabel = granted
      ? 'Access Granted'
      : denied
        ? 'Access Denied'
        : formatLabel(item.result || 'Pending');

    const statusColor = granted
      ? '#16865B'
      : denied
        ? '#D14343'
        : '#8A6D1D';

    const statusBackground = granted
      ? '#E6F6EE'
      : denied
        ? '#FDECEC'
        : '#FFF4D6';

    return (
      <View style={styles.logCard}>
        <View style={styles.logTop}>
          <View
            style={[
              styles.personIcon,
              { backgroundColor: statusBackground },
            ]}
          >
            <Ionicons
              name={
                granted
                  ? 'checkmark-circle-outline'
                  : denied
                    ? 'close-circle-outline'
                    : 'time-outline'
              }
              size={25}
              color={statusColor}
            />
          </View>

          <View style={styles.personInfo}>
            <Text style={styles.guestName} numberOfLines={1}>
              {item.guest_name || 'Unknown Person'}
            </Text>

            <Text style={styles.eventType}>
              {formatLabel(item.event_type || 'Entry event')}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusBackground },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <View style={styles.logDivider} />

        <View style={styles.detailRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color="#777F8C"
          />
          <Text style={styles.detailText}>
            {formatDate(item.event_time)}
          </Text>

          <Ionicons
            name="time-outline"
            size={16}
            color="#777F8C"
            style={styles.timeIcon}
          />
          <Text style={styles.detailText}>
            {formatTime(item.event_time)}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="key-outline"
            size={16}
            color="#777F8C"
          />
          <Text style={styles.detailText}>
            Method: {formatLabel(item.access_method)}
          </Text>
        </View>

        {item.lock_device_id ? (
          <View style={styles.detailRow}>
            <Ionicons
              name="hardware-chip-outline"
              size={16}
              color="#777F8C"
            />
            <Text style={styles.detailText} numberOfLines={1}>
              Lock: {item.lock_device_id}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FB" />

      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SECURTAP SECURITY</Text>
          <Text style={styles.title}>Entry Logs</Text>
          <Text style={styles.subtitle}>
            Monitor access to your establishment
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={refresh}
          accessibilityLabel="Refresh entry logs"
        >
          <Ionicons name="refresh-outline" size={22} color="#173F73" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={styles.statIconBlue}>
            <Ionicons name="list-outline" size={20} color="#245DB0" />
          </View>
          <Text style={styles.statNumber}>{logs.length}</Text>
          <Text style={styles.statLabel}>Total Logs</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconGreen}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#16865B"
            />
          </View>
          <Text style={styles.statNumber}>{grantedCount}</Text>
          <Text style={styles.statLabel}>Granted</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIconRed}>
            <Ionicons
              name="close-circle-outline"
              size={20}
              color="#D14343"
            />
          </View>
          <Text style={styles.statNumber}>{deniedCount}</Text>
          <Text style={styles.statLabel}>Denied</Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={21} color="#7C8491" />

        <TextInput
          style={styles.searchInput}
          placeholder="Search name, method, or lock..."
          placeholderTextColor="#939AA6"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          returnKeyType="search"
        />

        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color="#939AA6" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const selected = activeFilter === filter;

          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterButton,
                selected && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text
                style={[
                  styles.filterText,
                  selected && styles.filterTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Text style={styles.resultsCount}>
          {filteredLogs.length} records
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#245DB0" />
          <Text style={styles.stateText}>Loading entry logs...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color="#D14343"
          />
          <Text style={styles.emptyTitle}>Could not load logs</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLogs}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLog}
          contentContainerStyle={
            filteredLogs.length === 0
              ? styles.emptyList
              : styles.listContent
          }
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#245DB0"
            />
          }
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color="#A4ACB8"
              />
              <Text style={styles.emptyTitle}>No entry logs found</Text>
              <Text style={styles.stateText}>
                {search || activeFilter !== 'All'
                  ? 'Try changing your search or filter.'
                  : 'Entry records will appear here when available.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#245DB0',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
    marginBottom: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#17263C',
  },
  subtitle: {
    fontSize: 13,
    color: '#788394',
    marginTop: 5,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8EFFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    minHeight: 112,
    borderWidth: 1,
    borderColor: '#E9EDF3',
  },
  statIconBlue: {
    backgroundColor: '#E8F0FF',
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  statIconGreen: {
    backgroundColor: '#E6F6EE',
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  statIconRed: {
    backgroundColor: '#FDECEC',
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#17263C',
  },
  statLabel: {
    fontSize: 11,
    color: '#788394',
    marginTop: 2,
  },
  searchBox: {
    marginHorizontal: 16,
    marginBottom: 14,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E6EAF0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#17263C',
    paddingVertical: 0,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  filterButton: {
    paddingHorizontal: 19,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#E9EDF4',
  },
  filterButtonActive: {
    backgroundColor: '#245DB0',
  },
  filterText: {
    color: '#687487',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#17263C',
  },
  resultsCount: {
    fontSize: 12,
    color: '#788394',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E9EDF3',
    padding: 15,
    marginBottom: 12,
  },
  logTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  personInfo: {
    flex: 1,
    marginRight: 5,
  },
  guestName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#17263C',
  },
  eventType: {
    fontSize: 12,
    color: '#788394',
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    maxWidth: 112,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logDivider: {
    height: 1,
    backgroundColor: '#EDF0F5',
    marginVertical: 13,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
    gap: 7,
  },
  detailText: {
    fontSize: 12,
    color: '#687487',
    flexShrink: 1,
  },
  timeIcon: {
    marginLeft: 8,
  },
  centerState: {
    flexGrow: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateText: {
    fontSize: 13,
    color: '#788394',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  emptyTitle: {
    color: '#17263C',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 12,
  },
  emptyList: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  retryButton: {
    backgroundColor: '#245DB0',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 11,
    marginTop: 16,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
