#!/usr/bin/env node

require('es6-promise').polyfill();
var fetch = require('isomorphic-fetch');
var meow = require('meow');
var getStdin = require('get-stdin');
var graphqlviz = require('./');

var cli = meow([
  'Options:',
  '  -f, --nofields     render without field',
  '  -a, --noargs       render without field arguments',
  '  -m, --nomutations  render without field arguments',
  '  -v, --verbose      print introspection result',
  '',
  'Usage',
  '  $ ./cli.js [url] [options]',
  '      Renders dot schema from [url] endpoint',
  '',
  'Examples',
  '  $ ./cli.js https://localhost:3000/graphql -a | dot -Tpng -o graph.png',
  ' '
], {
  alias: {
    v: 'verbose',
    a: 'noargs',
    f: 'nofields',
    m: 'nomutations'
  }
});

// build render options
var opts = {
  noargs: cli.flags.noargs,
  nofields: cli.flags.nofields,
  nomutations: cli.flags.nomutations
};

function terminate() {
  // cli.showHelp();
  console.error(cli.help);
  process.exit(1);
}

if (cli.input[0] === 'query') {
  process.stdout.write(JSON.stringify({query: graphqlviz.query}) + '\n');
} else if (cli.input.length === 0) {
  getStdin().then(function (stdin) {
    if (stdin.trim() === '') {
      return terminate();
    }

    try {
      console.log(graphqlviz.render(stdin, opts));
    } catch (e) {
      console.error('Invalid introspection result on stdin. Use --verbose flag to see it.');
      console.error('Error: ' + e.message);

      if (cli.flags.verbose) {
        console.error(stdin);
      }

      process.exit(1);
    }
  });
} else if (cli.input.length === 1) {
  fetch(cli.input[0], {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({query: graphqlviz.query})
  }).then(function (res) {
    return res.text();
  }).then(function (text) {
    var json;

    if (!text) {
      return terminate();
    }

    try {
      json = JSON.parse(text);
    } catch (e) {
      console.error('Not a valid JSON. Use --verbose flag to see output.');

      if (cli.flags.verbose) {
        console.error(text);
      }

      process.exit(1);
    }

    try {
      console.log(graphqlviz.render(json, opts));
    } catch (e) {
      console.error('Invalid introspection result. Use --verbose flag to see output.');

      if (cli.flags.verbose) {
        console.error(text);
      }

      process.exit(1);
    }
  }).catch(function (e) {
    console.error('ERROR: ' + e.message);
    process.exit(1);
  });
} else {
  terminate();
}
