# graphqlviz [![Build Status](https://travis-ci.org/ngleich/graphqlviz.svg?branch=master)](https://travis-ci.org/ngleich/graphqlviz)

> GraphQL Visualization.
[Based on sheerun/graphqlviz](https://github.com/sheerun/graphqlviz)

Usage
---

Download the script

```
git clone git@github.com:ngleich/graphqlviz.git
```

Usage
```
$ ./cli.js [url] [options]
    Renders dot schema from [url] endpoint
```

Options:
```
-f, --nofields     render without field
-a, --noargs       render without field arguments
-m, --nomutations  render without field arguments
-v, --verbose      print introspection result
```

Examples
```
$ ./cli.js https://localhost:3000/graphql -a | dot -Tpng -o graph.png
```