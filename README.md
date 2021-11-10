<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/wovalle/angelos"></a>

<h3 align="center">angelos</h3>
  <p align="center">
    Angelos automates the synchronization of <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/routing-to-tunnel/dns">DNS Records</a> between your server and cloudflare. Specially useful if you're using <a href="https://developers.cloudflare.com/cloudflare-one/connections/connect-apps">Cloudflare tunnels</a> to expose your services to internet
    <br />
    <br />
    <a href="https://github.com/wovalle/angelos/discussions/2">Roadmap</a>
    ·
    <a href="https://github.com/wovalle/angelos/issues">Report Bug</a>
    ·
    <a href="https://github.com/wovalle/angelos/issues">Request Feature</a>
  </p>
</div>

## About The Project

In Greek mythology, Angelos (Ancient Greek: Ἄγγελος) was the first daughter of Zeus and [Hera](https://github.com/aschzero/hera). 


<p align="right">(<a href="#top">back to top</a>)</p>

## Prerequisites
- You must already have a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide) running.


##  Configuration
Ang

| Env Var | Default | Description  |
| ------------- |-------------| -----|
| CLOUDFLARE_ZONE_ID  *    | `N/A` | Zone id where your domain is|
| CLOUDFLARE_API_TOKEN  *    | `N/A` | CF Api Token with edit DNS Record Permission. See [here](https://github.com/wovalle/angelos/discussions/4)|
| CLOUDFLARE_TUNNEL_URL  *    | `N/A` | Your [tunnel url](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide) that should follow `uuid.cfargotunnel.com` |
| PROVIDER     | `docker` | Supported values: `docker`, `traefik`. If provider=`docker` you must pass a docker sock (see docker example) if provider=`traefik` you must pass `TRAEFIK_API_URL` |
| DOCKER_LABEL_HOSTNAME     | `angelos.hostname` | Which docker label will angelos use as a hostname  |
| DOCKER_LABEL_ENABLE     | `angelos.enabled` | If set to false, the service will be ignored   |
| LOG_LEVEL     | `info` | Possible values: `silly`, `trace`, `debug`, `info`, `warn`, `error`, `fatal` 
| DRY_RUN     | false | If set to true, Angelos will not create or delete DNS records |
| DELETE_DNS_RECORD_DELAY     | 300 | How many seconds it'll wait to delete a dns record in cf (in case you removed a service by mistake) |
| ADD_DNS_RECORD_DELAY     | 60 | How many seconds it'll wait to create a dns record in cf (in case you removed a service by mistake) |
| TRAEFIK_API_URL     | `N/A` | If provider=`traefik` this must point to Traefik's [api url](https://doc.traefik.io/traefik/operations/api/) |
| TRAEFIK_POLL_INTERVAL     | 600 | Indicates how often (in seconds) angelos will check traefik routers  |


### Running with Docker
```bash
docker run \
-e CLOUDFLARE_ZONE_ID=<cloudflare zone> \ # Required
-e CLOUDFLARE_API_TOKEN=<token with edit dns record permission> \ # Required
-e CLOUDFLARE_TUNNEL_URL=<tunnel-uuid.cfargotunnel.com> \ # Required
-e PROVIDER=docker \ # for more options, see Configuration
-v /var/run/docker.sock:/var/run/docker.sock \ # if provider=docker
ghcr.io/wovalle/angelos
```
### Running with Docker-Compose
```yaml
angelos:
  image: ghcr.io/wovalle/angelos
  container_name: angelos
  environment:
    - CLOUDFLARE_ZONE_ID=<cloudflare zone> # Required
    - CLOUDFLARE_API_TOKEN=<token with edit dns record permission> # Required
    - CLOUDFLARE_TUNNEL_URL=<tunnel-uuid.cfargotunnel.com> # Required
    - PROVIDER=docker
    # for more options, see Configuration
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock # if provider=docker
```

<p align="right">(<a href="#top">back to top</a>)</p>


## Contributing

Have a bug or a feature request? Please search [the issues](https://github.com/wovalle/fireorm/issues) to prevent duplication. If you couldn't find what you were looking for, [proceed to open a new one](https://github.com/wovalle/fireorm/issues/new). Pull requests are welcome!

### Commiting

This repo uses [Conventional Commits](https://www.conventionalcommits.org/) as the commit messages convention. Commits must follow [Angular's git commit guidelines](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).

Supported commit types ([source](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#type)):

- **feat:** A new feature
- **fix:** A bug fix
- **docs:** Documentation only changes
- **style:** Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **refactor:** A code change that neither fixes a bug nor adds a feature
- **perf:** A code change that improves performance
- **test:** Adding missing or correcting existing tests
- **chore:** Changes to the build process or auxiliary tools and libraries such as documentation generation

### Releases

This repo uses [Github Actions](https://github.com/wovalle/angelos/tree/main/.github/workflows) to automate workflows like run tests and create releases. It uses [Sematic Release](https://github.com/semantic-release/semantic-release) to bump the versions according to their commit messages. 

<p align="right">(<a href="#top">back to top</a>)</p>

## Contributors

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome! 

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="http://twitter.com/wovalle"><img src="https://avatars0.githubusercontent.com/u/7854116?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Willy Ovalle</b></sub></a><br /><a href="https://github.com/wovalle/fireorm/commits?author=wovalle" title="Code">💻</a> <a href="https://github.com/wovalle/fireorm/commits?author=wovalle" title="Documentation">📖</a> <a href="#example-wovalle" title="Examples">💡</a> <a href="#ideas-wovalle" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/wovalle/fireorm/commits?author=wovalle" title="Tests">⚠️</a></td>

  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

MIT © [Willy Ovalle](https://github.com/wovalle). See [LICENSE](https://github.com/wovalle/fireorm/blob/master/LICENSE) for details.

<p align="left">(<a href="#top">back to top</a>)</p>