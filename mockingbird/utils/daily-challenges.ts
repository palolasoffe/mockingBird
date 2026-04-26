import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  type: 'score' | 'powerups' | 'pipes' | 'survival';
  target: number;
  reward: string;
  completed: boolean;
  progress: number;
}

export interface DailyChallengeData {
  date: string;
  challenges: DailyChallenge[];
  completedCount: number;
}

export const generateDailyChallenges = (dateString: string): DailyChallenge[] => {
  const seed = dateString.split('-').reduce((acc, part) => acc + parseInt(part), 0);

  const challengeTemplates = [
    { type: 'score' as const, title: 'Score Master', description: 'Reach a score of {target}', targets: [10, 15, 20, 25, 30], reward: 'Score Multiplier' },
    { type: 'powerups' as const, title: 'Power Collector', description: 'Collect {target} power-ups', targets: [2, 3, 4, 5], reward: 'Extra Power-up' },
    { type: 'pipes' as const, title: 'Pipe Dodger', description: 'Pass through {target} pipes', targets: [15, 20, 25, 30, 35], reward: 'Shield Boost' },
    { type: 'survival' as const, title: 'Survival Expert', description: 'Survive for {target} seconds', targets: [30, 45, 60, 75], reward: 'Time Bonus' }
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
      reward: template.reward,
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
    const stored = await AsyncStorage.getItem('DAILY_CHALLENGES');
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

    await AsyncStorage.setItem('DAILY_CHALLENGES', JSON.stringify(newData));
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
    await AsyncStorage.setItem('DAILY_CHALLENGES', JSON.stringify(data));
  } catch (error) {
    console.warn('Error saving daily challenges:', error);
  }
};

export const updateChallengeProgress = async (
  type: DailyChallenge['type'],
  increment: number
): Promise<DailyChallengeData> => {

  const data = await loadDailyChallenges();

  let completedCount = 0;

  data.challenges.forEach(challenge => {
    if (challenge.type === type && !challenge.completed) {
      challenge.progress = Math.min(
        challenge.progress + increment,
        challenge.target
      );

      if (challenge.progress >= challenge.target) {
        challenge.completed = true;
      }
    }

    if (challenge.completed) {
      completedCount++;
    }
  });

  data.completedCount = completedCount;

  await saveDailyChallenges(data);

  return data;
};