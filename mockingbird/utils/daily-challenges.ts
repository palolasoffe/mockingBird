import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'score' | 'powerups' | 'pipes' | 'survival';
  target: number;
  rewardValue: number;
  completed: boolean;
  progress: number;
}

export interface DailyChallengeData {
  date: string;
  challenges: DailyChallenge[];
  completedCount: number;
  newlyCompleted?: DailyChallenge | null;
}

const STORAGE_KEY = 'DAILY_CHALLENGES_V7';

export const generateDailyChallenges = (dateString: string): DailyChallenge[] => {
  const seed = dateString.split('-').reduce((acc, part) => acc + parseInt(part), 0);

  const challengeTemplates = [
    { type: 'score' as const, title: 'Score Shark', description: 'Collect a total of {target} points', targets: [50, 100, 150], baseReward: 50 },
    { type: 'pipes' as const, title: 'Pipe Master', description: 'Pass through a total of {target} pipes', targets: [30, 60, 90], baseReward: 60 },
    { type: 'powerups' as const, title: 'Power Collector', description: 'Collect a total of {target} power-ups', targets: [5, 10, 15], baseReward: 75 },
    { type: 'survival' as const, title: 'Survivor', description: 'Survive for a total of {target} seconds', targets: [120, 240, 300], baseReward: 100 }
  ];

  const selectedIndices = [
    (seed + 0) % challengeTemplates.length,
    (seed + 1) % challengeTemplates.length,
    (seed + 2) % challengeTemplates.length
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  while (selectedIndices.length < 3) {
    const newIndex = (seed + selectedIndices.length + 3) % challengeTemplates.length;
    if (!selectedIndices.includes(newIndex)) selectedIndices.push(newIndex);
  }

  return selectedIndices.slice(0, 3).map((templateIndex, index) => {
    const template = challengeTemplates[templateIndex];
    const target = template.targets[(seed + index) % template.targets.length];

    return {
      id: `${dateString}-${template.type}-${index}`,
      title: template.title,
      description: template.description.replace('{target}', target.toString()),
      type: template.type,
      target,
      rewardValue: template.baseReward,
      completed: false,
      progress: 0
    };
  });
};

export const getTodayString = (): string => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

export const loadDailyChallenges = async (): Promise<DailyChallengeData> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const today = getTodayString();

    if (stored) {
      const data: DailyChallengeData = JSON.parse(stored);
      if (data.date === today) {
        return data;
      }
    }

    const newData: DailyChallengeData = {
      date: today,
      challenges: generateDailyChallenges(today),
      completedCount: 0
    };

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
    return newData;
  } catch (error) {
    console.warn('Daily challenges load failed:', error);
    return {
      date: getTodayString(),
      challenges: generateDailyChallenges(getTodayString()),
      completedCount: 0
    };
  }
};

export const saveDailyChallenges = async (data: DailyChallengeData): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Error saving daily challenges:', error);
  }
};

export const updateMultipleChallenges = async (
  updates: Partial<Record<DailyChallenge['type'], number>>
): Promise<DailyChallengeData> => {
  const data = await loadDailyChallenges();
  let newlyCompleted: DailyChallenge | null = null;
  let completedCount = 0;

  data.challenges.forEach(challenge => {
    const increment = updates[challenge.type];

    if (increment !== undefined && increment > 0 && !challenge.completed) {
      const oldProgress = challenge.progress;
      challenge.progress = Math.min(
        challenge.progress + increment,
        challenge.target
      );

      if (challenge.progress >= challenge.target && oldProgress < challenge.target) {
        challenge.completed = true;
        newlyCompleted = challenge;
      }
    }

    if (challenge.completed) {
      completedCount++;
    }
  });

  data.completedCount = completedCount;
  data.newlyCompleted = newlyCompleted;
  await saveDailyChallenges(data);
  return data;
};

export const updateChallengeProgress = async (
  type: DailyChallenge['type'],
  increment: number
): Promise<DailyChallengeData> => {
  return updateMultipleChallenges({ [type]: increment });
};
