import React from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

function SectionTitle({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionUnderline} />
    </View>
  );
}

function FeatureCard({ label, icon, onPress, disabled = false }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, disabled && styles.cardDisabled]}
    >
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen({ onNavigate }) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBarWrap}>
        <View style={styles.topBar}>
          <Pressable style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#ffffff" />
          </Pressable>
          <View style={styles.logoBadge}>
            <Text style={styles.logoMain}>FPT Education</Text>
            <Text style={styles.logoSub}>FPT UNIVERSITY</Text>
          </View>
          <View style={styles.topRightPlaceholder} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SectionTitle title="Notification and Application status" />
        <View style={styles.grid2}>
          <FeatureCard
            label="Notification"
            icon={<Ionicons name="notifications" size={44} color="#f59e0b" />}
            disabled
          />
          <FeatureCard
            label="Application status"
            icon={<MaterialCommunityIcons name="clipboard-account" size={44} color="#f59e0b" />}
            onPress={() => onNavigate?.('application')}
          />
        </View>

        <SectionTitle title="Information Access" />
        <View style={styles.grid2}>
          <FeatureCard
            label="Weekly timetable"
            icon={<MaterialCommunityIcons name="calendar-week" size={44} color="#f59e0b" />}
            disabled
          />
          <FeatureCard
            label="Exam schedule"
            icon={<MaterialCommunityIcons name="calendar-clock" size={44} color="#f59e0b" />}
            disabled
          />
        </View>

        <View style={styles.singleCardWrap}>
          <FeatureCard
            label="Lịch nghỉ năm"
            icon={<MaterialCommunityIcons name="calendar-month" size={44} color="#f59e0b" />}
            onPress={() => onNavigate?.('calendar')}
          />
        </View>

        <SectionTitle title="Reports" />
        <View style={styles.grid2}>
          <FeatureCard
            label="Academic report"
            icon={<MaterialCommunityIcons name="file-chart" size={44} color="#f59e0b" />}
            disabled
          />
          <FeatureCard
            label="View profile"
            icon={<Ionicons name="person-circle" size={44} color="#f59e0b" />}
            onPress={() => onNavigate?.('profile')}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ececec',
  },
  topBarWrap: {
    backgroundColor: '#ffffff',
    paddingBottom: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  topBar: {
    backgroundColor: '#f59e0b',
    height: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  menuButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightPlaceholder: {
    width: 36,
    height: 36,
  },
  logoBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: 6,
    width: 190,
    backgroundColor: '#fff7ed',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingVertical: 8,
    alignItems: 'center',
  },
  logoMain: {
    color: '#1f4b99',
    fontWeight: '700',
    fontSize: 16,
  },
  logoSub: {
    color: '#b45309',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 1,
    letterSpacing: 0.4,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 24,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 18,
    marginTop: 8,
  },
  sectionTitle: {
    color: '#1565c0',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionUnderline: {
    marginTop: 10,
    width: 64,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#1e88e5',
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 14,
    rowGap: 14,
  },
  singleCardWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  card: {
    width: '48.3%',
    minHeight: 168,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.9,
  },
  iconWrap: {
    marginBottom: 10,
  },
  cardLabel: {
    color: '#f59e0b',
    fontWeight: '700',
    fontSize: 17,
    textAlign: 'center',
  },
});
