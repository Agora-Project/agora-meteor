/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: GPL, Check file LICENSE
*/

Package.describe({
    name: 'agoraforum:core',
    version: '0.0.8',
    summary: 'Graph-based forum',
    git: 'https://github.com/Agora-Project/agora-meteor',
    documentation: 'README.md'
});

Package.onUse(function(api) {
    both = ['client', 'server']

    api.versionsFrom('1.1.0.3');
    
    api.addFiles([
        'lib/identity_collections/identity_collections.js',
        'lib/grapher/layered_grapher.js'
    ], both);

    api.addFiles([
        'lib/XBBCode/xbbcode.js',
        'lib/XBBCode/xbbcode.css'
    ], 'client');
    
    api.addFiles([
        'lib/schemas/post.js',
        'lib/schemas/report.js',
        'lib/schemas/vote.js',
        'routes.js'
    ], both);

    api.addFiles([
        'client/subscribe.js',
        'client/navigation.js',
        'client/main.css',
        'client/main.js'
    ], 'client');

    api.addFiles([
        'client/userList/userList.html',
        'client/userList/userList.js'
    ], 'client');
    
    api.addFiles([
        'client/webglView/webglView.html',
        'client/webglView/webglView.css',
        'client/webglView/webglView.js'
    ], 'client');

    api.addFiles([
        'client/templates.html',
    ], 'client');

    api.addFiles([
        'client/userProfile/userProfile.html',
        'client/userProfile/userProfile.css',
        'client/userProfile/userProfile.js'
    ], 'client');


    api.addFiles([
        'client/adminScreen/adminScreen.html',
        'client/adminScreen/adminScreen.css',
        'client/adminScreen/adminScreen.js'
    ], 'client');

    api.addAssets([
        'public/agoraforum.png'
    ], 'client');
    
    api.addFiles([
        'server/initial-data.js',
        'server/methods.js',
        'server/publish.js',
        'server/users.js'
    ], 'server');

    api.use([
        'session',
        'templating',
        'reactive-var',
        'ui',
        'd3js:d3@3.5.5',
        'zodiase:mdl@1.0.2',
        'utilities:avatar@0.9.2'
    ], 'client');

    api.use([
        'ecmascript@0.6.0',
        'iron:router@1.0.0',
        'aldeed:collection2@2.3.3',
        'matb33:collection-hooks@0.7.13',
        'accounts-base',
        'alanning:roles@1.2.13'
    ], both);
});

Package.onTest(function(api) {
    api.use('tinytest');
    api.use('agoraforum:core', ['client', 'server']);
});
