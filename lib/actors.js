/*
    Agora Forum Software
    Copyright (C) 2018 Gregory Sartucci
    License: AGPL-3.0, Check file LICENSE
*/

this.Actors = new Mongo.Collection('actors');

this.Actors.attachSchema(activityPubActor);
