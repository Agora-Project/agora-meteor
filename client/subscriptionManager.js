subscriptionManager = new SubsManager({
    // maximum number of cache subscriptions
    cacheLimit: 1000,
    // any subscription will be expire after 5 minute, if it's not subscribed again
    expireIn: 600
});
