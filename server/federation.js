
//import webfinger from '../lib/webfinger/lib/webfinger.js';

importFromActivityPubJSON = function(json) {
    if (!json.type) throw new Meteor.Error('untyped ActivityPub JSON');

    if (actorTypes.includes(json.type))
        importActorFromActivityPubJSON(json);

    else if (json.type == 'Note')
        importPostFromActivityPubJSON(json);
}

importActorFromActivityPubJSON = function(json) {
    let actor = Actors.findOne({id: json.id});
    if (!actor) {
        Actors.insert(json);
        console.log("!!!");
    } else console.log("Actor: ", actor);
}

importPostFromActivityPubJSON = function(json) {
    console.log("!!!");
}
