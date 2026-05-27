module.exports = {
  story: {
    title: 'Raconteur',
    subtitle: 'Ghost Writers',
    difficulty: 'Simple',
    description: 'Collaborate in writing stories one line at a time with minimal context.',
    more: 'Raconteur is inspired by improv-type games where players contribute to a story one sentence or one word at a time. ' +
      'The idea is to create unique stories from a train of thought going who knows where. Continuity is held only ' +
      'by the last line in the story, so writing with ambiguity allows for more interesting stories. ' +
      'Similar to old parlor game Consequences.',
    howTo: [
      'Every player will be given a line in a story',
      'Players will continue the story one line at a time',
      'At the end, players can enjoy the crazy stories they wrote together',
    ],
    playTime: '15-20m',
    config: {
      players: {
        name: 'Max Players',
        text: 'Players',
        info: 'Maximum allowed players in the game',
        type: 'int',
        min: 2,
        max: 256,
        defaults: '#numPlayers',
      },
      numStories: {
        name: 'Story Count',
        text: 'Stories',
        info: 'The number of stories being written',
        type: 'int',
        min: 1,
        max: 256,
        defaults: '#numPlayers',
        hidden: true,
      },
      numLinks: {
        name: 'Lines per Story',
        text: 'Lines',
        info: 'How many lines are in a story',
        type: 'int',
        min: 3,
        max: 256,
        defaults: 10,
        hidden: true,
      },
      anonymous: {
        name: 'Hide Authors',
        text: 'Anonymous',
        info: 'Whether names are shown at the end.',
        type: 'bool',
        defaults: 'false',
      },
      timeLimit: {
        name: 'Turn Time Limit',
        text: 'Time Limit',
        info: 'How long each player has to write their line before it is skipped',
        type: 'list',
        defaults: 'none',
        options: [{
          name: 'none',
          text: 'None',
          value: 0,
        }, {
          name: 'sec30',
          text: '30 sec',
          value: 30,
        }, {
          name: 'min1',
          text: '1 min',
          value: 60,
        }, {
          name: 'min2',
          text: '2 min',
          value: 120,
        }, {
          name: 'min5',
          text: '5 min',
          value: 300,
        }],
      },
    },
  },
};
