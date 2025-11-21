const USER_COLORS = ['#a11134', '#2a7e34', '#b29d11', '#2f4597', '#ab5b22'];

const ADJECTIVES = [
  'Happy', 'Clever', 'Brave', 'Swift', 'Bright', 'Calm', 'Bold', 'Quick', 
  'Wise', 'Cool', 'Kind', 'Smart', 'Wild', 'Free', 'Pure', 'Strong',
  'Gentle', 'Noble', 'Fierce', 'Sharp', 'Sleek', 'Vivid', 'Zesty'
];

const ANIMALS = [
  'Tiger', 'Eagle', 'Wolf', 'Fox', 'Bear', 'Lion', 'Hawk', 'Deer',
  'Owl', 'Shark', 'Lynx', 'Otter', 'Raven', 'Falcon', 'Puma', 'Seal',
  'Whale', 'Cobra', 'Gecko', 'Moose', 'Bison', 'Crane', 'Viper'
];

function generateUser() {
  const userId = Math.random().toString().substring(2, 6);
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  const fullName = `${adjective} ${animal}-${userId}`;
  
  return {
    name: fullName,
    email: `${adjective.toLowerCase()}.${animal.toLowerCase()}${userId}@example.com`,
    color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
  };
}

export { USER_COLORS, ADJECTIVES, ANIMALS, generateUser };