Package.describe({
  name: 'agoraforum:core',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: 'Graph-based forum',
  // URL to the Git repository containing the source code for this package.
  git: 'https://github.com/Agora-Project/agora-meteor',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  both = ['client', 'server']

  api.versionsFrom('1.1.0.3');

  api.addFiles([
      'client/subscribe.coffee',
      'client/users.html',
      'client/users.js',
      'client/templates.html',
      'client/graph.js',
      'client/navigation.coffee',
      'client/main.css'
    ], 'client');

  api.addFiles([
      'lib/schemas/argument.coffee',
      'lib/schemas/link.coffee',
      'lib/schemas/vote.coffee',
      'routes.coffee'
    ], both);

  api.addFiles([
      'server/initial-data.coffee',
      'server/links.coffee',
      'server/permits.coffee',
      'server/publish.coffee',
      'server/users.js'
    ], 'server');

//    meteor-platform
//    coffeescript
//    aldeed:collection2
//    matb33:collection-hooks
//    iron:router
//    d3js:d3
//    reactive-var

//    simoes:d3plus
//    alanning:roles
//    zodiase:mdl
//    momentjs:moment

//TODO probably should go outside of packaeg
//accounts-password
//useraccounts:core
//less
//softwarerero:accounts-t9n

    api.use([
      'session',
      'templating',
      'ui',
      'less',
      'underscore',
      'd3js:d3',
      'simoes:d3plus',
      'zodiase:mdl'
    ], 'client');

    api.use([
      'coffeescript',
      'reactive-var',
      'deps',
      'iron:router@1.0.0',
      'aldeed:collection2',
      'matb33:collection-hooks',
      'accounts-base',
      'mrt:moment@2.8.1',
      'alanning:roles@1.2.13',
      'meteorhacks:subs-manager@1.2.0',
    ], both);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('agoraforum:core', ['client', 'server']);
});
