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
        'agoraforum:backend-core',
        'agoraforum:frontend-cytoscape'
    ], both);
});

Package.onTest(function(api) {
    api.use('tinytest');
    api.use('agoraforum:core', ['client', 'server']);
});
