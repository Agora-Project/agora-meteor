
//import webfinger from '../lib/webfinger/lib/webfinger.js';

Meteor.methods({
    getActivityJSONFromUrl: function(url) {
        return getActivityFromUrl(url)
        .then((response) => {
            if (response)
                return response.json();
                else throw new Meteor.Error('No response from url');
        })
        .then((json) => {
            if (json) Meteor.call('importFromActivityPubJSON', json);

            return json;
        });
    },
    importFromActivityPubJSON: function(json) {
        if (!json) throw new Meteor.Error('Empty JSON');

        if (!json.type) throw new Meteor.Error('Untyped ActivityPub JSON');

        if (activityPubActorTypes.includes(json.type))
            importActorFromActivityPubJSON(json);

        else if (activityPubObjectTypes.includes(json.type))
            importPostFromActivityPubJSON(json);
    }
});

importActorFromActivityPubJSON = function(json) {
    if (!Actors.findOne({id: json.id})) { //Is actor already present? If not,
        Actors.insert(json);             //add it.
    }
};

importPostFromActivityPubJSON = function(json) {
    if (!Posts.findOne({id: json.id})) { //Is post already present? If not,
        Posts.insert(json);                  //add the post.
    }
};
