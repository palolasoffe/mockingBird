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
    if (completed) return '#4CAF50'; // Green
    if (progress > 0) return '#FF9800'; // Orange
    return '#757575'; // Gray
  };

  const getProgressText = (challenge: any) => {
    if (challenge.completed) return '✓';
    return `${challenge.progress}/${challenge.target}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Daily Challenges</Text>
      <Text style={styles.subtitle}>
        {challenges.completedCount}/{challenges.challenges.length} completed
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

          <Text style={styles.rewardText}>
            Reward: {challenge.reward}
          </Text>

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
    borderRadius: 12,
    margin: 16,
    borderWidth: 2,
    borderColor: '#ff5e5e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ff5e5e',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  challengeItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  completedText: {
    color: '#4CAF50',
  },
  progressBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 40,
    alignItems: 'center',
  },
  progressText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#cccccc',
    marginBottom: 4,
  },
  rewardText: {
    fontSize: 12,
    color: '#ff5e5e',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});