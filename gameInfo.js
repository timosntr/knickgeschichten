module.exports = {
  story: {
    title: 'Knickgeschichten',
    subtitle: '',
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
        hidden: true,
      },
      timeLimit: {
        name: 'Turn Time Limit',
        text: 'Time Limit',
        info: 'How long each player has to write their line before it is skipped',
        type: 'list',
        defaults: 'none',
        hidden: true,
        options: [{
          name: 'none',
          text: 'None',
          value: 0,
        }, {
          name: 'sec30',
          text: '30 sec',
          value: 30,
        }, {
          name: 'sec100',
          text: '100 sec',
          value: 100,
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
        }, {
          name: 'min10',
          text: '10 min',
          value: 600,
        }],
      },
    },
  },
};
