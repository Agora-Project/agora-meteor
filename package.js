Package.describe({
  name: 'agoraforum:core',
  version: '0.0.5',
  summary: 'Graph-based forum',
  git: 'https://github.com/Agora-Project/agora-meteor',
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
      'client/navigation.js',
      'client/main.css'
    ], 'client');

  api.addAssets([
      'public/agoraforum.png'
    ], 'client');

  api.addFiles([
      'lib/schemas/post.coffee',
      'lib/schemas/link.coffee',
      'lib/schemas/vote.coffee',
      'routes.coffee'
    ], both);

  api.addFiles([
      'server/initial-data.coffee',
      'server/methods.coffee',
      'server/permits.coffee',
      'server/publish.coffee',
      'server/users.js'
    ], 'server');

    api.use([
      'session',
      'templating',
      'ui',
      'd3js:d3@3.5.5',
      'simoes:d3plus@1.7.3',
      'zodiase:mdl@1.0.2'
    ], 'client');

    api.use([
      'coffeescript',
      'reactive-var',
      'iron:router@1.0.0',
      'aldeed:collection2@2.3.3',
      'matb33:collection-hooks@0.7.13',
      'accounts-base',
      'mrt:moment@2.8.1',
      'alanning:roles@1.2.13',
      'meteorhacks:subs-manager@1.2.0'
    ], both);
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('agoraforum:core', ['client', 'server']);
});
