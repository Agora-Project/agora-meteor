
//import webfinger from '../lib/webfinger/lib/webfinger.js';

Meteor.methods({
    getActivityJSONFromUrl: function(url) {
        return getActivityFromUrl(url)
        .then((response) => {
            return response.json();
        })
        .then((json) => {
            Meteor.call('importFromActivityPubJSON', json);

            return json;
        });
    },
    importFromActivityPubJSON: function(json) {
        if (!json.type) throw new Meteor.Error('untyped ActivityPub JSON');

        if (activityPubActorTypes.includes(json.type))
            importActorFromActivityPubJSON(json);

        else if (activityPubObjectTypes.includes(json.type))
            importPostFromActivityPubJSON(json);
    }
});

importActorFromActivityPubJSON = function(json) {
    let actor = Actors.findOne({id: json.id}); //Is actor already present?
    if (!actor) {                              //If not,
        Actors.insert(json);                   //add it.
    }
};

importPostFromActivityPubJSON = function(json) {
};
