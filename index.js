// Shamelessly copied from:
// https://github.com/NathanRSmith/graphql-visualizer
// https://github.com/sheerun/graphqlviz

var _ = require('lodash');

module.exports.query = instrospectionQuery();

module.exports.render = function (schema, opts) {
  opts = opts || {};

  if (_.isString(schema)) {
    schema = JSON.parse(schema);
  }

  if (!_.isPlainObject(schema)) {
    throw new Error('Must be plain object');
  }

  // find entry points
  var rootPath = walkBFS(schema, function (v, k, p) {
    if (k === '__schema') {
      return p;
    }
  });
  if (!rootPath) {
    throw new Error('Cannot find "__schema" object');
  }

  var root = _.get(schema, rootPath);

  var queries = getQuertEntities(root);
  var mutations = getMutationEntries(root);

  // build the dot
  var dotfile = 'digraph erd {\n';
  dotfile += graphDefaults();
  dotfile += queryNodes(queries, opts);
  if (!opts.nomutations) {
    dotfile += '\n';
    dotfile += mutationNodes(mutations);
  }
  dotfile += '\n\n';
  dotfile += queryEdges(queries);
  if (!opts.nomutations) {
    dotfile += '\n';
    dotfile += mutationEdges(mutations);
  }
  dotfile += '\n}';

  return dotfile;
};

// process a graphql type object
// returns simplified version of the type
function processType(item, entities, types) {
  var type = _.find(types, {name: item});

  var fields = _.map(type.fields, function (field) {
    var obj = {};
    obj.name = field.name;

    // process field type
    if (field.type.ofType) {
      obj.type = field.type.ofType.name;
      obj.isObjectType = field.type.ofType.kind === 'OBJECT';
      obj.isList = field.type.kind === 'LIST';
      obj.isRequired = field.type.kind === 'NON_NULL';
    } else {
      obj.type = field.type.name;
      obj.isObjectType = field.type.kind === 'OBJECT';
    }

    // process args
    if (field.args && field.args.length) {
      obj.args = _.map(field.args, function (arg) {
        var obj = {};
        obj.name = arg.name;
        if (arg.type.ofType) {
          obj.type = arg.type.ofType.name;
          obj.isRequired = arg.type.ofType.kind === 'NON_NULL';
        } else {
          obj.type = arg.type.name;
        }
        return obj;
      });
    }

    return obj;
  });

  entities[type.name] = {
    name: type.name,
    fields: fields
  };

  var linkeditems = _.chain(fields)
    .filter('isObjectType')
    .map('type')
    .uniq()
    .value();

  return linkeditems;
}

// walks the object in level-order
// invokes iter at each node
// if iter returns truthy, breaks & returns the value
// assumes no cycles
function walkBFS(obj, iter) {
  var q = _.map(_.keys(obj), function (k) {
    return {key: k, path: '["' + k + '"]'};
  });

  var current;
  var currentNode;
  var retval;
  var push = function (v, k) {
    q.push({key: k, path: current.path + '["' + k + '"]'});
  };
  while (q.length) {
    current = q.shift();
    currentNode = _.get(obj, current.path);
    retval = iter(currentNode, current.key, current.path);
    if (retval) {
      return retval;
    }

    if (_.isPlainObject(currentNode) || _.isArray(currentNode)) {
      _.each(currentNode, push);
    }
  }
}

function instrospectionQuery() {
  return 'query IntrospectionQuery {\n' +
    '__schema { \n' +
      'queryType { \n' +
        'name \n' +
      '} \n' +
      'mutationType { \n' +
        'name \n' +
        'fields { \n' +
          'name \n' +
          'type { \n' +
            'name \n' +
          '} \n' +
        '} \n' +
      '} \n' +
      'types { \n' +
        '...FullType \n' +
      '} \n' +
    '} \n' +
  '} \n' +
   '\n' +
  'fragment FullType on __Type { \n' +
    'kind \n' +
    'name \n' +
    'description \n' +
    'fields(includeDeprecated: true) { \n' +
      'name \n' +
      'description \n' +
      'args { \n' +
        '...InputValue \n' +
      '} \n' +
      'type { \n' +
        '...TypeRef \n' +
      '} \n' +
      'isDeprecated \n' +
      'deprecationReason \n' +
    '} \n' +
    'inputFields { \n' +
      '...InputValue \n' +
    '} \n' +
    'interfaces { \n' +
      '...TypeRef \n' +
    '} \n' +
    'enumValues(includeDeprecated: true) { \n' +
      'name \n' +
      'description \n' +
      'isDeprecated \n' +
      'deprecationReason \n' +
    '} \n' +
    'possibleTypes { \n' +
      '...TypeRef \n' +
    '} \n' +
  '} \n' +
   '\n' +
  'fragment InputValue on __InputValue { \n' +
    'name \n' +
    'description \n' +
    'type { \n' +
      '...TypeRef \n' +
    '} \n' +
    'defaultValue \n' +
  '} \n' +
   '\n' +
  'fragment TypeRef on __Type { \n' +
    'kind \n' +
    'name \n' +
    'ofType { \n' +
      'kind \n' +
      'name \n' +
      'ofType { \n' +
        'kind \n' +
        'name \n' +
        'ofType { \n' +
          'kind \n' +
          'name \n' +
        '} \n' +
      '} \n' +
    '} \n' +
  '}';
}

function graphDefaults() {
  return 'graph [\n' +
    '  rankdir = "LR"\n' +
    '];\n' +
    'node [\n' +
    '  fontsize = "16"\n' +
    '  shape = "ellipse"\n' +
    '];\n' +
    'edge [\n' +
    '];\n';
}

function getQuertEntities(root) {
  // build the graph
  var queries = [];
  if (root.queryType) {
    queries.push(root.queryType.name);
  }

  // walk the graph & build up nodes & edges
  var current;
  var entities = {};
  while (queries.length) {
    current = queries.shift();

    // if item has already been processed
    if (entities[current]) {
      continue;
    }

    // process item
    queries = queries.concat(processType(current, entities, root.types));
  }
  return entities;
}

function getMutationEntries(root) {
  if (root.mutationType) {
    return _.map(root.mutationType.fields, function (field) {
      return {name: field.name, type: field.type.name};
    });
  }
  return [];
}

function queryNodes(entities, opts) {
  return _.map(entities, function (v) {
    var rows = [];
    if (!opts.nofields) {
      rows = _.map(v.fields, function (v) {
        var str = v.name;

        // render args if desired & present
        if (!opts.noargs && v.args && v.args.length) {
          str += '(' + _.map(v.args, function (v) {
            return v.name + ':' + v.type;
          }).join(', ') + ')';
        }

        return str + ': ' +
          (v.isRequired ? '!' : '') +
          (v.isList ? '[' + v.type + ']' : v.type);
      });
    }
    rows.unshift(v.name);

    return v.name + ' [label="' + rows.join(' | ') + '" shape="record"];';
  }).join('\n');
}

function queryEdges(entities) {
  return _.chain(entities)
    .reduce(function (a, v) {
      _.each(v.fields, function (f) {
        if (!f.isObjectType) {
          return;
        }

        a.push(v.name + ' -> ' + f.type);
      });

      return a;
    }, [])
    .uniq()
    .value()
    .join('\n');
}

function mutationNodes(mutations) {
  return _.map(mutations, function (m) {
    return m.name + ' [label="' + m.name + '" shape="ellipse" style="filled" color="chartreuse"];';
  }).join('\n');
}

function mutationEdges(mutations) {
  return _.map(mutations, function (m) {
    return m.name + ' -> ' + m.type;
  }).join('\n');
}
