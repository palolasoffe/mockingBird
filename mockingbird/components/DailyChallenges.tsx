import { DailyChallenge, DailyChallengeData } from '@/utils/daily-challenges';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DailyChallengesProps {
  challenges: DailyChallengeData | null;
  onChallengePress?: (challenge: DailyChallenge) => void;
}

export const DailyChallenges: React.FC<DailyChallengesProps> = ({ challenges, onChallengePress }) => {
  if (!challenges) return null;

  const getProgressColor = (progress: number, target: number, completed: boolean) => {
    if (completed) return '#4CAF50'; // Vihreä
    if (progress > 0) return '#f1c40f'; // Keltainen
    return '#757575'; // Harmaa
  };

  const getProgressText = (challenge: DailyChallenge) => {
    if (challenge.completed) return '✓';
    return `${challenge.progress}/${challenge.target}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PÄIVÄN HAASTEET</Text>
      <Text style={styles.subtitle}>
        {challenges.completedCount}/{challenges.challenges.length} SUORITETTU
      </Text>

      {challenges.challenges.map((challenge) => (
        <TouchableOpacity
          key={challenge.id}
          style={[
            styles.challengeItem,
            challenge.completed && styles.completedItem
          ]}
          onPress={() => onChallengePress?.(challenge)}
          disabled={!onChallengePress}
        >
          <View style={styles.challengeHeader}>
            <Text style={[
              styles.challengeTitle,
              challenge.completed && styles.completedText
            ]}>
              {challenge.title}
            </Text>
            <View style={[
              styles.progressBadge,
              { backgroundColor: getProgressColor(challenge.progress, challenge.target, challenge.completed) }
            ]}>
              <Text style={styles.progressText}>
                {getProgressText(challenge)}
              </Text>
            </View>
          </View>

          <Text style={styles.challengeDescription}>
            {challenge.description}
          </Text>

          <View style={styles.rewardContainer}>
             <Text style={styles.rewardText}>PALKINTO: </Text>
             <Text style={styles.starText}>⭐ {challenge.rewardValue}</Text>
          </View>

          {!challenge.completed && (
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%`,
                    backgroundColor: getProgressColor(challenge.progress, challenge.target, false)
                  }
                ]}
              />
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 16,
    margin: 16,
    borderWidth: 3,
    borderColor: '#ff5e5e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
    width: '85%',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ff5e5e',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.8,
  },
  challengeItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  completedItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderColor: '#4CAF50',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    flex: 1,
  },
  completedText: {
    color: '#4CAF50',
  },
  progressBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 45,
    alignItems: 'center',
  },
  progressText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '900',
  },
  challengeDescription: {
    fontSize: 13,
    color: '#bbbbbb',
    marginBottom: 8,
    fontWeight: '500',
  },
  rewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  rewardText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: 'bold',
    opacity: 0.6,
  },
  starText: {
    fontSize: 13,
    color: '#f1c40f',
    fontWeight: '900',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});