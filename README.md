# agora-meteor

A graph-based web forum built using [meteor](https://www.meteor.com/). For an example server of the forum, see [agora-meteor-demo](https://github.com/Agora-Project/agora-meteor-demo/).

## Install

Within another meteor project, use [git](https://git-scm.com/) to do this:

```bash
git clone https://github.com/Agora-Project/agora-meteor packages/agoraforum:core
meteor add agoraforum:core
```

Your app will now include the Agora forum software, exposing its routes and methods.

## Usage

TODO

## Development

To hack on agora-meteor, download the source:

```bash
git clone https://github.com/Agora-Project/agora-meteor
cd agora-meteor
```

## Testing

To run unit tests one time and exit:

```bash
meteor test --once --driver-package dispatch:mocha
```

To run full-app tests one time and exit:

```bash
meteor test --once --full-app --driver-package dispatch:mocha
```

To run in watch mode, restarting as you change files, add TEST_WATCH=1 before your test command and remove the --once flag. For example:

```bash
TEST_WATCH=1 meteor test --driver-package dispatch:mocha
```

(text lifted from the [dispatch:mocha](https://atmospherejs.com/dispatch/mocha) readme, which agora-meteor uses for its test suite)

## Contributing

To contribute to Agora, please see agora-meteor's [issues](https://github.com/Agora-Project/agora-meteor/issues) page, and either submit an issue reflecting your problem or concern or request, or pick one out and leave a comment asking for guidance. The maintainers will pick it up :)

Once you've got a patch for an issue, please submit a PR. Thank you for your help!

## License

GPL-3.0. See the `LICENSE` file for the license's full text.
