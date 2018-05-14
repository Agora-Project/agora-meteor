
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
        if (!json.type) throw new Meteor.Error('Untyped ActivityPub JSON');

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
    let post = Posts.findOne({id: json.id}); //Is post already present?
    if (!post) {                             //If not,
        Posts.insert(json);                  //add it.
    } else console.log(post);
};
