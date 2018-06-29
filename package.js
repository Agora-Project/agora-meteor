/*
    Agora Forum Software
    Copyright (C) 2016 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

Package.describe({
    name: 'agoraforum:core',
    version: '0.1.3',
    summary: 'Graph-based forum',
    git: 'https://github.com/Agora-Project/agora-meteor',
    documentation: 'README.md'
});

Npm.depends({
    step: '1.0.0',
    xml2js: '0.4.19',
    request: '2.87.0',
    'node-rsa': '1.0.0'
});

Package.onUse(function(api) {
    both = ['client', 'server'];

    api.use([
        'mongo',
        'accounts-password',
        'useraccounts:core',
        'agoraforum:activitypub',
        'ecmascript',
        'iron:router',
        'useraccounts:iron-routing',
        'matb33:collection-hooks',
        'accounts-base',
        'alanning:roles',
        'utilities:avatar',
        'spacebars',
        'email',
        'http'
    ], both);

    api.use([
        'mrest:restivus',
        'percolate:migrations'
    ], 'server');

    api.addFiles([
        'lib/identity_collections/identity_collections.js',
        'lib/grapher/layered_grapher.js',
        'lib/collections/actors.js',
        'lib/collections/posts.js',
        'lib/collections/reports.js',
        'lib/collections/users.js',
        'lib/collections/orderedCollections.js',
        'lib/collections/activities.js',
        'routes.js'
    ], both);


    api.addFiles([
        'lib/webfinger/lib/webfinger.js',
        'server/methods.js',
        'server/publish.js',
        'server/clientActivity.js',
        'server/federation.js',
        'lib/collections/keys.js',
        'server/migrations.js',
        'server/initial-data.js'
    ], 'server');

    api.addFiles([
        'client/lib/notifier.js',
        'client/lib/requestAnimationFrame.js',
        'client/lib/templateParents.js',
        'client/lib/seenPosts.js',
        'client/subscriptionManager.js'
    ], 'client');

    api.addFiles([
        'client/main.html',
        'client/main.css',
        'client/init.js'
    ], 'client');

    api.addFiles([
        'client/userList/userList.html',
        'client/userList/userList.js'
    ], 'client');

    api.addFiles([
        'client/federation/federation.html',
        'client/federation/federation.js',
        'client/federation/federation.css'
    ], 'client');

    api.addFiles([
        'client/errorPage/errorPage.html'
    ], 'client');

    api.addFiles([
        'client/mainView/detailed/detailed.html',
        'client/mainView/detailed/detailed.css',
        'client/mainView/detailed/detailed.js',
        'client/mainView/reply/reply.html',
        'client/mainView/reply/reply.css',
        'client/mainView/reply/reply.js',
        'client/mainView/main.html',
        'client/mainView/main.css',
        'client/mainView/layout.js',
        'client/mainView/partitioner.js',
        'client/mainView/camera.js',
        'client/mainView/renderer.js',
        'client/mainView/main.js'
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

    api.use([
        'ui',
        'session',
        'templating',
        'reactive-var',
        'verron:autosize',
        'momentjs:moment',
        'gwendall:body-events',
        'meteorhacks:subs-manager'
    ], 'client');
});

Package.onTest(function(api) {
    api.use('tinytest');
    api.use('agoraforum:core', ['client', 'server']);
});
