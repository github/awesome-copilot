# 🤖 Awesome GitHub Copilot
[![Powered by Awesome Copilot](https://img.shields.io/badge/Powered_by-Awesome_Copilot-blue?logo=githubcopilot)](https://aka.ms/awesome-github-copilot) [![GitHub contributors from allcontributors.org](https://img.shields.io/github/all-contributors/github/awesome-copilot?color=ee8449)](#contributors-)

A community-created collection of custom agents, instructions, skills, hooks, workflows, and plugins to supercharge your GitHub Copilot experience.

> [!TIP]
> **Explore the full collection on the website →** [awesome-copilot.github.com](https://awesome-copilot.github.com)
>
> The website offers full-text search and filtering across hundreds of resources, plus the [Tools](https://awesome-copilot.github.com/tools) section for MCP servers and developer tooling, and the [Learning Hub](https://awesome-copilot.github.com/learning-hub) for guides and tutorials.
>
> **Using this collection in an AI agent?** A machine-readable [`llms.txt`](https://awesome-copilot.github.com/llms.txt) is available with structured listings of all agents, instructions, and skills.

## 📖 Learning Hub

New to GitHub Copilot customization? The **[Learning Hub](https://awesome-copilot.github.com/learning-hub)** on the website offers curated articles, walkthroughs, and reference material — covering everything from core concepts like agents, skills, and instructions to hands-on guides for hooks, agentic workflows, MCP servers, and the Copilot coding agent.

## What's in this repo

| Resource | Description | Browse |
|----------|-------------|--------|
| 🤖 [Agents](docs/README.agents.md) | Specialized Copilot agents that integrate with MCP servers | [All agents →](https://awesome-copilot.github.com/agents) |
| 📋 [Instructions](docs/README.instructions.md) | Coding standards applied automatically by file pattern | [All instructions →](https://awesome-copilot.github.com/instructions) |
| 🎯 [Skills](docs/README.skills.md) | Self-contained folders with instructions and bundled assets | [All skills →](https://awesome-copilot.github.com/skills) |
| 🔌 [Plugins](docs/README.plugins.md) | Curated bundles of agents and skills for specific workflows | [All plugins →](https://awesome-copilot.github.com/plugins) |
| 🪝 [Hooks](docs/README.hooks.md) | Automated actions triggered during Copilot agent sessions | [All hooks →](https://awesome-copilot.github.com/hooks) |
| ⚡ [Agentic Workflows](docs/README.workflows.md) | AI-powered GitHub Actions automations written in markdown | [All workflows →](https://awesome-copilot.github.com/workflows) |
| 🍳 [Cookbook](cookbook/README.md) | Copy-paste-ready recipes for working with Copilot APIs | — |

## 🛠️ Tools

Looking at how to use Awesome Copilot? Check out the **[Tools section](https://awesome-copilot.github.com/tools)** of the website for MCP servers, editor integrations, and other developer tooling to get the most out of this collection.

## Install a Plugin

For most users, the **Awesome Copilot** marketplace is already registered in the Copilot CLI/VS Code, so you can install a plugin directly:

```bash
copilot plugin install <plugin-name>@awesome-copilot
```

If you are using an older Copilot CLI version or a custom setup and see an error that the marketplace is unknown, register it once and then install:

```bash
copilot plugin marketplace add github/awesome-copilot
copilot plugin install <plugin-name>@awesome-copilot
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) · [AGENTS.md](AGENTS.md) for AI agent guidance · [Security](SECURITY.md) · [Code of Conduct](CODE_OF_CONDUCT.md)

> The customizations here are sourced from third-party developers. Please inspect any agent and its documentation before installing.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](./CONTRIBUTING.md#contributors-recognition)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.aaron-powell.com/"><img src="https://avatars.githubusercontent.com/u/434140?v=4" width="100px;" alt=""/><br /><sub><b>Aaron Powell</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://codemilltech.com/"><img src="https://avatars.githubusercontent.com/u/2053639?v=4" width="100px;" alt=""/><br /><sub><b>Matt Soucoup</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.buymeacoffee.com/troystaylor"><img src="https://avatars.githubusercontent.com/u/44444967?v=4" width="100px;" alt=""/><br /><sub><b>Troy Simeon Taylor</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abbas133"><img src="https://avatars.githubusercontent.com/u/7757139?v=4" width="100px;" alt=""/><br /><sub><b>Abbas</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://calva.io/"><img src="https://avatars.githubusercontent.com/u/30010?v=4" width="100px;" alt=""/><br /><sub><b>Peter Strömberg</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://danielscottraynsford.com/"><img src="https://avatars.githubusercontent.com/u/7589164?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Scott-Raynsford</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jhauga"><img src="https://avatars.githubusercontent.com/u/10998676?v=4" width="100px;" alt=""/><br /><sub><b>John Haugabook</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://witter.cz/@pavel"><img src="https://avatars.githubusercontent.com/u/7853836?v=4" width="100px;" alt=""/><br /><sub><b>Pavel Simsa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://digitarald.de/"><img src="https://avatars.githubusercontent.com/u/8599?v=4" width="100px;" alt=""/><br /><sub><b>Harald Kirschner</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://mubaidr.js.org/"><img src="https://avatars.githubusercontent.com/u/2222702?v=4" width="100px;" alt=""/><br /><sub><b>Muhammad Ubaid Raza</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tmeschter"><img src="https://avatars.githubusercontent.com/u/10506730?v=4" width="100px;" alt=""/><br /><sub><b>Tom Meschter</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.aungmyokyaw.com/"><img src="https://avatars.githubusercontent.com/u/9404824?v=4" width="100px;" alt=""/><br /><sub><b>Aung Myo Kyaw</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JasonYeMSFT"><img src="https://avatars.githubusercontent.com/u/39359541?v=4" width="100px;" alt=""/><br /><sub><b>JasonYeMSFT</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/jrc356/"><img src="https://avatars.githubusercontent.com/u/37387479?v=4" width="100px;" alt=""/><br /><sub><b>Jon Corbin</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/troytaylor-msft"><img src="https://avatars.githubusercontent.com/u/248058374?v=4" width="100px;" alt=""/><br /><sub><b>troytaylor-msft</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://delatorre.dev/"><img src="https://avatars.githubusercontent.com/u/38289677?v=4" width="100px;" alt=""/><br /><sub><b>Emerson Delatorre</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/burkeholland"><img src="https://avatars.githubusercontent.com/u/686963?v=4" width="100px;" alt=""/><br /><sub><b>Burke Holland</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://yaooqinn.github.io/"><img src="https://avatars.githubusercontent.com/u/8326978?v=4" width="100px;" alt=""/><br /><sub><b>Kent Yao</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.devprodlogs.com/"><img src="https://avatars.githubusercontent.com/u/51440732?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Meppiel</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yeelam-gordon"><img src="https://avatars.githubusercontent.com/u/73506701?v=4" width="100px;" alt=""/><br /><sub><b>Gordon Lam</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.madskristensen.net/"><img src="https://avatars.githubusercontent.com/u/1258877?v=4" width="100px;" alt=""/><br /><sub><b>Mads Kristensen</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://ks6088ts.github.io/"><img src="https://avatars.githubusercontent.com/u/1254960?v=4" width="100px;" alt=""/><br /><sub><b>Shinji Takenaka</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/spectatora"><img src="https://avatars.githubusercontent.com/u/1385755?v=4" width="100px;" alt=""/><br /><sub><b>spectatora</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sinedied"><img src="https://avatars.githubusercontent.com/u/593151?v=4" width="100px;" alt=""/><br /><sub><b>Yohan Lasorsa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/VamshiVerma"><img src="https://avatars.githubusercontent.com/u/21999324?v=4" width="100px;" alt=""/><br /><sub><b>Vamshi Verma</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://montemagno.com/"><img src="https://avatars.githubusercontent.com/u/1676321?v=4" width="100px;" alt=""/><br /><sub><b>James Montemagno</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/alefragnani"><img src="https://avatars.githubusercontent.com/u/3781424?v=4" width="100px;" alt=""/><br /><sub><b>Alessandro Fragnani</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/ambilykk/"><img src="https://avatars.githubusercontent.com/u/10282550?v=4" width="100px;" alt=""/><br /><sub><b>Ambily</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/krushideep"><img src="https://avatars.githubusercontent.com/u/174652083?v=4" width="100px;" alt=""/><br /><sub><b>krushideep</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mihsoft"><img src="https://avatars.githubusercontent.com/u/53946345?v=4" width="100px;" alt=""/><br /><sub><b>devopsfan</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://tgrall.github.io/"><img src="https://avatars.githubusercontent.com/u/541250?v=4" width="100px;" alt=""/><br /><sub><b>Tugdual Grall</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.promptboost.dev/"><img src="https://avatars.githubusercontent.com/u/5461862?v=4" width="100px;" alt=""/><br /><sub><b>Oren Me</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mjrousos"><img src="https://avatars.githubusercontent.com/u/10077254?v=4" width="100px;" alt=""/><br /><sub><b>Mike Rousos</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://devkimchi.com/"><img src="https://avatars.githubusercontent.com/u/1538528?v=4" width="100px;" alt=""/><br /><sub><b>Justin Yoo</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/guiopen"><img src="https://avatars.githubusercontent.com/u/94094527?v=4" width="100px;" alt=""/><br /><sub><b>Guilherme do Amaral Alves </b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/griffinashe/"><img src="https://avatars.githubusercontent.com/u/6391612?v=4" width="100px;" alt=""/><br /><sub><b>Griffin Ashe</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anchildress1"><img src="https://avatars.githubusercontent.com/u/6563688?v=4" width="100px;" alt=""/><br /><sub><b>Ashley Childress</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.senseof.tech/"><img src="https://avatars.githubusercontent.com/u/50712277?v=4" width="100px;" alt=""/><br /><sub><b>Adrien Clerbois</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vhivi"><img src="https://avatars.githubusercontent.com/u/38220028?v=4" width="100px;" alt=""/><br /><sub><b>ANGELELLI David</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://markdav.is/"><img src="https://avatars.githubusercontent.com/u/311063?v=4" width="100px;" alt=""/><br /><sub><b>Mark Davis</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MattVevang"><img src="https://avatars.githubusercontent.com/u/20714898?v=4" width="100px;" alt=""/><br /><sub><b>Matt Vevang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://max.irro.at/"><img src="https://avatars.githubusercontent.com/u/589073?v=4" width="100px;" alt=""/><br /><sub><b>Maximilian Irro</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nullchimp"><img src="https://avatars.githubusercontent.com/u/58362593?v=4" width="100px;" alt=""/><br /><sub><b>NULLchimp</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pkarda"><img src="https://avatars.githubusercontent.com/u/12649718?v=4" width="100px;" alt=""/><br /><sub><b>Peter Karda</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sdolgin"><img src="https://avatars.githubusercontent.com/u/576449?v=4" width="100px;" alt=""/><br /><sub><b>Saul Dolgin</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/shubham070"><img src="https://avatars.githubusercontent.com/u/5480589?v=4" width="100px;" alt=""/><br /><sub><b>Shubham Gaikwad</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TheovanKraay"><img src="https://avatars.githubusercontent.com/u/24420698?v=4" width="100px;" alt=""/><br /><sub><b>Theo van Kraay</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TianqiZhang"><img src="https://avatars.githubusercontent.com/u/5326582?v=4" width="100px;" alt=""/><br /><sub><b>Tianqi Zhang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.miniasp.com/"><img src="https://avatars.githubusercontent.com/u/88981?v=4" width="100px;" alt=""/><br /><sub><b>Will 保哥</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://tsubalog.hatenablog.com/"><img src="https://avatars.githubusercontent.com/u/1592808?v=4" width="100px;" alt=""/><br /><sub><b>Yuta Matsumura</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anschnapp"><img src="https://avatars.githubusercontent.com/u/17565996?v=4" width="100px;" alt=""/><br /><sub><b>anschnapp</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hizahizi-hizumi"><img src="https://avatars.githubusercontent.com/u/163728895?v=4" width="100px;" alt=""/><br /><sub><b>hizahizi-hizumi</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jianminhuang.cc/"><img src="https://avatars.githubusercontent.com/u/6296280?v=4" width="100px;" alt=""/><br /><sub><b>黃健旻 Vincent Huang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://brunoborges.io/"><img src="https://avatars.githubusercontent.com/u/129743?v=4" width="100px;" alt=""/><br /><sub><b>Bruno Borges</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.movinglive.ca/"><img src="https://avatars.githubusercontent.com/u/14792628?v=4" width="100px;" alt=""/><br /><sub><b>Steve Magne</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://shaneneuville.com/"><img src="https://avatars.githubusercontent.com/u/5375137?v=4" width="100px;" alt=""/><br /><sub><b>Shane Neuville</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://asilva.dev/"><img src="https://avatars.githubusercontent.com/u/2493377?v=4" width="100px;" alt=""/><br /><sub><b>André Silva</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/agreaves-ms"><img src="https://avatars.githubusercontent.com/u/111466195?v=4" width="100px;" alt=""/><br /><sub><b>Allen Greaves</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AmeliaRose802"><img src="https://avatars.githubusercontent.com/u/26167931?v=4" width="100px;" alt=""/><br /><sub><b>Amelia Payne</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/BBoyBen"><img src="https://avatars.githubusercontent.com/u/34445365?v=4" width="100px;" alt=""/><br /><sub><b>BBoyBen</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://azureincubations.io/"><img src="https://avatars.githubusercontent.com/u/45323234?v=4" width="100px;" alt=""/><br /><sub><b>Brooke Hamilton</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/GeekTrainer"><img src="https://avatars.githubusercontent.com/u/6109729?v=4" width="100px;" alt=""/><br /><sub><b>Christopher Harrison</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/breakid"><img src="https://avatars.githubusercontent.com/u/1446918?v=4" width="100px;" alt=""/><br /><sub><b>Dan</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://blog.codewithdan.com/"><img src="https://avatars.githubusercontent.com/u/1767249?v=4" width="100px;" alt=""/><br /><sub><b>Dan Wahlin</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://debbie.codes/"><img src="https://avatars.githubusercontent.com/u/13063165?v=4" width="100px;" alt=""/><br /><sub><b>Debbie O'Brien</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/echarrod"><img src="https://avatars.githubusercontent.com/u/1381991?v=4" width="100px;" alt=""/><br /><sub><b>Ed Harrod</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://learn.microsoft.com/dotnet"><img src="https://avatars.githubusercontent.com/u/24882762?v=4" width="100px;" alt=""/><br /><sub><b>Genevieve Warren</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/guigui42"><img src="https://avatars.githubusercontent.com/u/2376010?v=4" width="100px;" alt=""/><br /><sub><b>Guillaume</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/riqueufmg"><img src="https://avatars.githubusercontent.com/u/108551585?v=4" width="100px;" alt=""/><br /><sub><b>Henrique Nunes</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jeremiah-snee-openx"><img src="https://avatars.githubusercontent.com/u/113928685?v=4" width="100px;" alt=""/><br /><sub><b>Jeremiah Snee</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kartikdhiman"><img src="https://avatars.githubusercontent.com/u/59189590?v=4" width="100px;" alt=""/><br /><sub><b>Kartik Dhiman</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://kristiyanvelkov.com/"><img src="https://avatars.githubusercontent.com/u/40764277?v=4" width="100px;" alt=""/><br /><sub><b>Kristiyan Velkov</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/msalaman"><img src="https://avatars.githubusercontent.com/u/28122166?v=4" width="100px;" alt=""/><br /><sub><b>msalaman</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://soderlind.no/"><img src="https://avatars.githubusercontent.com/u/1649452?v=4" width="100px;" alt=""/><br /><sub><b>Per Søderlind</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://dotneteers.net/"><img src="https://avatars.githubusercontent.com/u/28162552?v=4" width="100px;" alt=""/><br /><sub><b>Peter Smulovics</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/madvimer"><img src="https://avatars.githubusercontent.com/u/3188898?v=4" width="100px;" alt=""/><br /><sub><b>Ravish Rathod</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ricksm.it/"><img src="https://avatars.githubusercontent.com/u/7207783?v=4" width="100px;" alt=""/><br /><sub><b>Rick Smit</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pertrai1"><img src="https://avatars.githubusercontent.com/u/442374?v=4" width="100px;" alt=""/><br /><sub><b>Rob Simpson</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/inquinity"><img src="https://avatars.githubusercontent.com/u/406234?v=4" width="100px;" alt=""/><br /><sub><b>Robert Altman</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://salih.guru/"><img src="https://avatars.githubusercontent.com/u/76786120?v=4" width="100px;" alt=""/><br /><sub><b>Salih</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://graef.io/"><img src="https://avatars.githubusercontent.com/u/19261257?v=4" width="100px;" alt=""/><br /><sub><b>Sebastian Gräf</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SebastienDegodez"><img src="https://avatars.githubusercontent.com/u/2349146?v=4" width="100px;" alt=""/><br /><sub><b>Sebastien DEGODEZ</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sesmyrnov"><img src="https://avatars.githubusercontent.com/u/59627981?v=4" width="100px;" alt=""/><br /><sub><b>Sergiy Smyrnov</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SomeSolutionsArchitect"><img src="https://avatars.githubusercontent.com/u/139817767?v=4" width="100px;" alt=""/><br /><sub><b>SomeSolutionsArchitect</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kewalaka"><img src="https://avatars.githubusercontent.com/u/3146590?v=4" width="100px;" alt=""/><br /><sub><b>Stu Mace</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/STRUDSO"><img src="https://avatars.githubusercontent.com/u/1543732?v=4" width="100px;" alt=""/><br /><sub><b>Søren Trudsø Mahon</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://enakdesign.com/"><img src="https://avatars.githubusercontent.com/u/14024037?v=4" width="100px;" alt=""/><br /><sub><b>Tj Vita</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pelikhan"><img src="https://avatars.githubusercontent.com/u/4175913?v=4" width="100px;" alt=""/><br /><sub><b>Peli de Halleux</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.paulomorgado.net/"><img src="https://avatars.githubusercontent.com/u/470455?v=4" width="100px;" alt=""/><br /><sub><b>Paulo Morgado</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://paul.crane.net.nz/"><img src="https://avatars.githubusercontent.com/u/808676?v=4" width="100px;" alt=""/><br /><sub><b>Paul Crane</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.pamelafox.org/"><img src="https://avatars.githubusercontent.com/u/297042?v=4" width="100px;" alt=""/><br /><sub><b>Pamela Fox</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://oskarthornblad.se/"><img src="https://avatars.githubusercontent.com/u/640102?v=4" width="100px;" alt=""/><br /><sub><b>Oskar Thornblad</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nischays"><img src="https://avatars.githubusercontent.com/u/54121853?v=4" width="100px;" alt=""/><br /><sub><b>Nischay Sharma</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Naikabg"><img src="https://avatars.githubusercontent.com/u/19915620?v=4" width="100px;" alt=""/><br /><sub><b>Nikolay Marinov</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/niksac"><img src="https://avatars.githubusercontent.com/u/20246918?v=4" width="100px;" alt=""/><br /><sub><b>Nik Sachdeva</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://onetipaweek.com/"><img src="https://avatars.githubusercontent.com/u/833231?v=4" width="100px;" alt=""/><br /><sub><b>Nick Taylor</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://nicholasdbrady.github.io/cookbook/"><img src="https://avatars.githubusercontent.com/u/18353756?v=4" width="100px;" alt=""/><br /><sub><b>Nick Brady</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nastanford"><img src="https://avatars.githubusercontent.com/u/1755947?v=4" width="100px;" alt=""/><br /><sub><b>Nathan Stanford Sr</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/matebarabas"><img src="https://avatars.githubusercontent.com/u/22733424?v=4" width="100px;" alt=""/><br /><sub><b>Máté Barabás</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mikeparker104"><img src="https://avatars.githubusercontent.com/u/12763221?v=4" width="100px;" alt=""/><br /><sub><b>Mike Parker</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mikekistler"><img src="https://avatars.githubusercontent.com/u/85643503?v=4" width="100px;" alt=""/><br /><sub><b>Mike Kistler</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/giomartinsdev"><img src="https://avatars.githubusercontent.com/u/125399281?v=4" width="100px;" alt=""/><br /><sub><b>Giovanni de Almeida Martins</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dgh06175"><img src="https://avatars.githubusercontent.com/u/77305722?v=4" width="100px;" alt=""/><br /><sub><b>이상현</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zooav"><img src="https://avatars.githubusercontent.com/u/12625412?v=4" width="100px;" alt=""/><br /><sub><b>Ankur Sharma</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/webreidi"><img src="https://avatars.githubusercontent.com/u/55603905?v=4" width="100px;" alt=""/><br /><sub><b>Wendy Breiding</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/voidfnc"><img src="https://avatars.githubusercontent.com/u/194750710?v=4" width="100px;" alt=""/><br /><sub><b>voidfnc</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://about.me/shane-lee"><img src="https://avatars.githubusercontent.com/u/5466825?v=4" width="100px;" alt=""/><br /><sub><b>shane lee</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/sdanzo-hrb"><img src="https://avatars.githubusercontent.com/u/136493100?v=4" width="100px;" alt=""/><br /><sub><b>sdanzo-hrb</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nativebpm"><img src="https://avatars.githubusercontent.com/u/33398121?v=4" width="100px;" alt=""/><br /><sub><b>sauran</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/samqbush"><img src="https://avatars.githubusercontent.com/u/74389839?v=4" width="100px;" alt=""/><br /><sub><b>samqbush</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pareenaverma"><img src="https://avatars.githubusercontent.com/u/59843121?v=4" width="100px;" alt=""/><br /><sub><b>pareenaverma</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/oleksiyyurchyna"><img src="https://avatars.githubusercontent.com/u/10256765?v=4" width="100px;" alt=""/><br /><sub><b>oleksiyyurchyna</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/time-by-waves"><img src="https://avatars.githubusercontent.com/u/34587654?v=4" width="100px;" alt=""/><br /><sub><b>oceans-of-time</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kshashank57"><img src="https://avatars.githubusercontent.com/u/57212456?v=4" width="100px;" alt=""/><br /><sub><b>kshashank57</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hueanmy"><img src="https://avatars.githubusercontent.com/u/20430626?v=4" width="100px;" alt=""/><br /><sub><b>Meii</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/factory-davidgu"><img src="https://avatars.githubusercontent.com/u/229352262?v=4" width="100px;" alt=""/><br /><sub><b>factory-davidgu</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dangelov-qa"><img src="https://avatars.githubusercontent.com/u/92313553?v=4" width="100px;" alt=""/><br /><sub><b>dangelov-qa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/BenoitMaucotel"><img src="https://avatars.githubusercontent.com/u/54392431?v=4" width="100px;" alt=""/><br /><sub><b>BenoitMaucotel</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/benjisho-aidome"><img src="https://avatars.githubusercontent.com/u/218995725?v=4" width="100px;" alt=""/><br /><sub><b>benjisho-aidome</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yukiomoto"><img src="https://avatars.githubusercontent.com/u/38450410?v=4" width="100px;" alt=""/><br /><sub><b>Yuki Omoto</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/wschultz-boxboat"><img src="https://avatars.githubusercontent.com/u/110492948?v=4" width="100px;" alt=""/><br /><sub><b>Will Schultz</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://bio.warengonzaga.com/"><img src="https://avatars.githubusercontent.com/u/15052701?v=4" width="100px;" alt=""/><br /><sub><b>Waren Gonzaga</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://linktr.ee/vincentkoc"><img src="https://avatars.githubusercontent.com/u/25068?v=4" width="100px;" alt=""/><br /><sub><b>Vincent Koc</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Vaporjawn"><img src="https://avatars.githubusercontent.com/u/15694665?v=4" width="100px;" alt=""/><br /><sub><b>Victor Williams</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://vesharma.dev/"><img src="https://avatars.githubusercontent.com/u/62218708?v=4" width="100px;" alt=""/><br /><sub><b>Ve Sharma</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.ferryhopper.com/"><img src="https://avatars.githubusercontent.com/u/19361558?v=4" width="100px;" alt=""/><br /><sub><b>Vasileios Lahanas</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://tinyurl.com/3p5j9mwe"><img src="https://avatars.githubusercontent.com/u/9591887?v=4" width="100px;" alt=""/><br /><sub><b>Udaya Veeramreddygari</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/iletai"><img src="https://avatars.githubusercontent.com/u/26614687?v=4" width="100px;" alt=""/><br /><sub><b>Tài Lê</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tsubasaogawa.me/"><img src="https://avatars.githubusercontent.com/u/7788821?v=4" width="100px;" alt=""/><br /><sub><b>Tsubasa Ogawa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://glsauto.com/"><img src="https://avatars.githubusercontent.com/u/132710946?v=4" width="100px;" alt=""/><br /><sub><b>Troy Witthoeft (glsauto)</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jfversluis.dev/"><img src="https://avatars.githubusercontent.com/u/939291?v=4" width="100px;" alt=""/><br /><sub><b>Gerald Versluis</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/geoder101"><img src="https://avatars.githubusercontent.com/u/145904?v=4" width="100px;" alt=""/><br /><sub><b>George Dernikos</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/gautambaghel"><img src="https://avatars.githubusercontent.com/u/22324290?v=4" width="100px;" alt=""/><br /><sub><b>Gautam</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/feapaydin"><img src="https://avatars.githubusercontent.com/u/19946639?v=4" width="100px;" alt=""/><br /><sub><b>Furkan Enes</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/fmuecke"><img src="https://avatars.githubusercontent.com/u/7921024?v=4" width="100px;" alt=""/><br /><sub><b>Florian Mücke</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.felixarjuna.dev/"><img src="https://avatars.githubusercontent.com/u/79026094?v=4" width="100px;" alt=""/><br /><sub><b>Felix Arjuna</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ewega"><img src="https://avatars.githubusercontent.com/u/26189114?v=4" width="100px;" alt=""/><br /><sub><b>Eldrick Wega</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/danchev"><img src="https://avatars.githubusercontent.com/u/12420863?v=4" width="100px;" alt=""/><br /><sub><b>Dobri Danchev</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://dgamboa.com/"><img src="https://avatars.githubusercontent.com/u/7052267?v=4" width="100px;" alt=""/><br /><sub><b>Diego Gamboa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/derekclair"><img src="https://avatars.githubusercontent.com/u/5247629?v=4" width="100px;" alt=""/><br /><sub><b>Derek Clair</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://dev.to/davidortinau"><img src="https://avatars.githubusercontent.com/u/41873?v=4" width="100px;" alt=""/><br /><sub><b>David Ortinau</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/danielabbatt"><img src="https://avatars.githubusercontent.com/u/8926756?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Abbatt</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CypherHK"><img src="https://avatars.githubusercontent.com/u/230935834?v=4" width="100px;" alt=""/><br /><sub><b>CypherHK</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/craigbekker"><img src="https://avatars.githubusercontent.com/u/1115912?v=4" width="100px;" alt=""/><br /><sub><b>Craig Bekker</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.peug.net/"><img src="https://avatars.githubusercontent.com/u/3845786?v=4" width="100px;" alt=""/><br /><sub><b>Christophe Peugnet</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lechnerc77"><img src="https://avatars.githubusercontent.com/u/22294087?v=4" width="100px;" alt=""/><br /><sub><b>Christian Lechner</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/charris-msft"><img src="https://avatars.githubusercontent.com/u/74415662?v=4" width="100px;" alt=""/><br /><sub><b>Chris Harris</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/artemsaveliev"><img src="https://avatars.githubusercontent.com/u/15679218?v=4" width="100px;" alt=""/><br /><sub><b>Artem Saveliev</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://javaetmoi.com/"><img src="https://avatars.githubusercontent.com/u/838318?v=4" width="100px;" alt=""/><br /><sub><b>Antoine Rey</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/PiKa919"><img src="https://avatars.githubusercontent.com/u/96786190?v=4" width="100px;" alt=""/><br /><sub><b>Ankit Das</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alineavila"><img src="https://avatars.githubusercontent.com/u/24813256?v=4" width="100px;" alt=""/><br /><sub><b>Aline Ávila</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/martin-cod"><img src="https://avatars.githubusercontent.com/u/33550246?v=4" width="100px;" alt=""/><br /><sub><b>Alexander Martinkevich</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/aldunchev"><img src="https://avatars.githubusercontent.com/u/4631021?v=4" width="100px;" alt=""/><br /><sub><b>Aleksandar Dunchev</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.qreate.it/"><img src="https://avatars.githubusercontent.com/u/1868590?v=4" width="100px;" alt=""/><br /><sub><b>Alan Sprecacenere</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/akashxlr8"><img src="https://avatars.githubusercontent.com/u/58072860?v=4" width="100px;" alt=""/><br /><sub><b>Akash Kumar Shaw</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abdidaudpropel"><img src="https://avatars.githubusercontent.com/u/51310019?v=4" width="100px;" alt=""/><br /><sub><b>Abdi Daud</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AIAlchemyForge"><img src="https://avatars.githubusercontent.com/u/253636689?v=4" width="100px;" alt=""/><br /><sub><b>AIAlchemyForge</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/4regab"><img src="https://avatars.githubusercontent.com/u/178603515?v=4" width="100px;" alt=""/><br /><sub><b>4regab</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MiguelElGallo"><img src="https://avatars.githubusercontent.com/u/60221874?v=4" width="100px;" alt=""/><br /><sub><b>Miguel P Z</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://a11ysupport.io/"><img src="https://avatars.githubusercontent.com/u/498678?v=4" width="100px;" alt=""/><br /><sub><b>Michael Fairchild</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/michael-volz/"><img src="https://avatars.githubusercontent.com/u/129928?v=4" width="100px;" alt=""/><br /><sub><b>Michael A. Volz (Flynn)</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Mike-Hanna"><img src="https://avatars.githubusercontent.com/u/50142889?v=4" width="100px;" alt=""/><br /><sub><b>Michael</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.mehmetalierol.com/"><img src="https://avatars.githubusercontent.com/u/16721723?v=4" width="100px;" alt=""/><br /><sub><b>Mehmet Ali EROL</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://maxprilutskiy.com/"><img src="https://avatars.githubusercontent.com/u/5614659?v=4" width="100px;" alt=""/><br /><sub><b>Max Prilutskiy</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mbianchidev"><img src="https://avatars.githubusercontent.com/u/37507190?v=4" width="100px;" alt=""/><br /><sub><b>Matteo Bianchi</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://marknoble.com/"><img src="https://avatars.githubusercontent.com/u/3819700?v=4" width="100px;" alt=""/><br /><sub><b>Mark Noble</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ManishJayaswal"><img src="https://avatars.githubusercontent.com/u/9527491?v=4" width="100px;" alt=""/><br /><sub><b>Manish Jayaswal</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://linktr.ee/lukemurray"><img src="https://avatars.githubusercontent.com/u/24467442?v=4" width="100px;" alt=""/><br /><sub><b>Luke Murray</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/LouellaCreemers"><img src="https://avatars.githubusercontent.com/u/46204894?v=4" width="100px;" alt=""/><br /><sub><b>Louella Creemers</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/saikoumudi"><img src="https://avatars.githubusercontent.com/u/22682497?v=4" width="100px;" alt=""/><br /><sub><b>Sai Koumudi Kaluvakolanu</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/whiteken"><img src="https://avatars.githubusercontent.com/u/20211937?v=4" width="100px;" alt=""/><br /><sub><b>Kenny White</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/KaloyanGenev"><img src="https://avatars.githubusercontent.com/u/42644424?v=4" width="100px;" alt=""/><br /><sub><b>KaloyanGenev</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Ranrar"><img src="https://avatars.githubusercontent.com/u/95967772?v=4" width="100px;" alt=""/><br /><sub><b>Kim Skov Rasmussen</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.julien-dubois.com/"><img src="https://avatars.githubusercontent.com/u/316835?v=4" width="100px;" alt=""/><br /><sub><b>Julien Dubois</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://digio.es/"><img src="https://avatars.githubusercontent.com/u/173672918?v=4" width="100px;" alt=""/><br /><sub><b>José Antonio Garrido</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://www.sugbo4j.co.nz/"><img src="https://avatars.githubusercontent.com/u/15100839?v=4" width="100px;" alt=""/><br /><sub><b>Joseph Gonzales</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yortch"><img src="https://avatars.githubusercontent.com/u/4576246?v=4" width="100px;" alt=""/><br /><sub><b>Jorge Balderas</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://johnpapa.net/"><img src="https://avatars.githubusercontent.com/u/1202528?v=4" width="100px;" alt=""/><br /><sub><b>John Papa</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.johnlokerse.dev/"><img src="https://avatars.githubusercontent.com/u/3514513?v=4" width="100px;" alt=""/><br /><sub><b>John</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://joe-watkins.io/"><img src="https://avatars.githubusercontent.com/u/3695795?v=4" width="100px;" alt=""/><br /><sub><b>Joe Watkins</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jan-v.nl/"><img src="https://avatars.githubusercontent.com/u/462356?v=4" width="100px;" alt=""/><br /><sub><b>Jan de Vries</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nohwnd"><img src="https://avatars.githubusercontent.com/u/5735905?v=4" width="100px;" alt=""/><br /><sub><b>Jakub Jareš</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jaxn"><img src="https://avatars.githubusercontent.com/u/29095?v=4" width="100px;" alt=""/><br /><sub><b>Jackson Miller</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Ioana37"><img src="https://avatars.githubusercontent.com/u/69301842?v=4" width="100px;" alt=""/><br /><sub><b>Ioana A</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hunterhogan"><img src="https://avatars.githubusercontent.com/u/2958419?v=4" width="100px;" alt=""/><br /><sub><b>Hunter Hogan</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/hashimwarren"><img src="https://avatars.githubusercontent.com/u/6027587?v=4" width="100px;" alt=""/><br /><sub><b>Hashim Warren</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Arggon"><img src="https://avatars.githubusercontent.com/u/20962238?v=4" width="100px;" alt=""/><br /><sub><b>Gonzalo</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://hachyderm.io/@0gis0"><img src="https://avatars.githubusercontent.com/u/175379?v=4" width="100px;" alt=""/><br /><sub><b>Gisela Torres</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/shibicr93"><img src="https://avatars.githubusercontent.com/u/6803434?v=4" width="100px;" alt=""/><br /><sub><b>Shibi Ramachandran</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lupritz"><img src="https://avatars.githubusercontent.com/u/145381941?v=4" width="100px;" alt=""/><br /><sub><b>lupritz</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/bhect0"><img src="https://avatars.githubusercontent.com/u/96436904?v=4" width="100px;" alt=""/><br /><sub><b>Héctor Benedicte</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tedvilutis"><img src="https://avatars.githubusercontent.com/u/69260340?v=4" width="100px;" alt=""/><br /><sub><b>Ted Vilutis</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://tonybaloney.github.io/"><img src="https://avatars.githubusercontent.com/u/1532417?v=4" width="100px;" alt=""/><br /><sub><b>Anthony Shaw</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ChrisMcKee1"><img src="https://avatars.githubusercontent.com/u/25754153?v=4" width="100px;" alt=""/><br /><sub><b>Chris McKee</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/CASTResearchLabs"><img src="https://avatars.githubusercontent.com/u/23238546?v=4" width="100px;" alt=""/><br /><sub><b>CASTResearchLabs</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jun-shiromizu"><img src="https://avatars.githubusercontent.com/u/211425548?v=4" width="100px;" alt=""/><br /><sub><b>白水淳</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://imransiddique.com/"><img src="https://avatars.githubusercontent.com/u/45405841?v=4" width="100px;" alt=""/><br /><sub><b>Imran Siddique</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/nblog"><img src="https://avatars.githubusercontent.com/u/10218627?v=4" width="100px;" alt=""/><br /><sub><b>共产主义接班人</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/av"><img src="https://avatars.githubusercontent.com/u/38184623?v=4" width="100px;" alt=""/><br /><sub><b>Ivan Charapanau</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/labudis"><img src="https://avatars.githubusercontent.com/u/2659733?v=4" width="100px;" alt=""/><br /><sub><b>Tadas Labudis</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.alvinashcraft.com/"><img src="https://avatars.githubusercontent.com/u/73072?v=4" width="100px;" alt=""/><br /><sub><b>Alvin Ashcraft</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://docs.microsoft.com/en-us/archive/blogs/jankrivanek/"><img src="https://avatars.githubusercontent.com/u/3809076?v=4" width="100px;" alt=""/><br /><sub><b>Jan Krivanek</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DUBSOpenHub"><img src="https://avatars.githubusercontent.com/u/158339470?v=4" width="100px;" alt=""/><br /><sub><b>Gregg Cochran</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Jcardif"><img src="https://avatars.githubusercontent.com/u/29174946?v=4" width="100px;" alt=""/><br /><sub><b>Josh N</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.ianzhang.cn/"><img src="https://avatars.githubusercontent.com/u/3264250?v=4" width="100px;" alt=""/><br /><sub><b>ian zhang</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.garrettsiegel.com/"><img src="https://avatars.githubusercontent.com/u/46652519?v=4" width="100px;" alt=""/><br /><sub><b>Garrett Siegel</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/v-rperez030"><img src="https://avatars.githubusercontent.com/u/248766827?v=4" width="100px;" alt=""/><br /><sub><b>Roberto Perez</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dvelton"><img src="https://avatars.githubusercontent.com/u/48307985?v=4" width="100px;" alt=""/><br /><sub><b>Dan Velton</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://leereilly.net/"><img src="https://avatars.githubusercontent.com/u/121322?v=4" width="100px;" alt=""/><br /><sub><b>Lee Reilly</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://bunnybox.info/"><img src="https://avatars.githubusercontent.com/u/743743?v=4" width="100px;" alt=""/><br /><sub><b>Daniel Coelho</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/vfaraji89"><img src="https://avatars.githubusercontent.com/u/62544375?v=4" width="100px;" alt=""/><br /><sub><b>Vahid Faraji</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/ashleywolf/"><img src="https://avatars.githubusercontent.com/u/10735907?v=4" width="100px;" alt=""/><br /><sub><b>Ashley Wolf</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://noahjenkins.com/"><img src="https://avatars.githubusercontent.com/u/41129202?v=4" width="100px;" alt=""/><br /><sub><b>Noah Jenkins</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jeremykohn"><img src="https://avatars.githubusercontent.com/u/5316595?v=4" width="100px;" alt=""/><br /><sub><b>Jeremy Kohn</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Hakku"><img src="https://avatars.githubusercontent.com/u/5256151?v=4" width="100px;" alt=""/><br /><sub><b>Harri Sipola</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://torumakabe.github.io/"><img src="https://avatars.githubusercontent.com/u/993850?v=4" width="100px;" alt=""/><br /><sub><b>Toru Makabe</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/delee03"><img src="https://avatars.githubusercontent.com/u/202738606?v=4" width="100px;" alt=""/><br /><sub><b>Pham Tien Thuan Phat</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/benjisho"><img src="https://avatars.githubusercontent.com/u/97973081?v=4" width="100px;" alt=""/><br /><sub><b>Benji Shohet</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://about.me/amauryleve"><img src="https://avatars.githubusercontent.com/u/11340282?v=4" width="100px;" alt=""/><br /><sub><b>Amaury Levé</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://timdeschryver.dev/"><img src="https://avatars.githubusercontent.com/u/28659384?v=4" width="100px;" alt=""/><br /><sub><b>Tim Deschryver</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/AlahmadiQ8"><img src="https://avatars.githubusercontent.com/u/3461501?v=4" width="100px;" alt=""/><br /><sub><b>Mohammad Asad Alahmadi</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://aka.readspeak.cn/app"><img src="https://avatars.githubusercontent.com/u/22270677?v=4" width="100px;" alt=""/><br /><sub><b>fondoger</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://linktr.ee/yuvai"><img src="https://avatars.githubusercontent.com/u/48050809?v=4" width="100px;" alt=""/><br /><sub><b>Yuval Avidani</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://querypanel.io/"><img src="https://avatars.githubusercontent.com/u/7916051?v=4" width="100px;" alt=""/><br /><sub><b>Csaba Iváncza</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://timheuer.com/blog/"><img src="https://avatars.githubusercontent.com/u/4821?v=4" width="100px;" alt=""/><br /><sub><b>Tim Heuer</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/lance2k"><img src="https://avatars.githubusercontent.com/u/38002304?v=4" width="100px;" alt=""/><br /><sub><b>lance2k</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://ag11.dev/"><img src="https://avatars.githubusercontent.com/u/20666190?v=4" width="100px;" alt=""/><br /><sub><b>Andrea Liliana Griffiths</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ajithraghavan"><img src="https://avatars.githubusercontent.com/u/37246967?v=4" width="100px;" alt=""/><br /><sub><b>Ajith Raghavan</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ninihen1"><img src="https://avatars.githubusercontent.com/u/123369259?v=4" width="100px;" alt=""/><br /><sub><b>Catherine Han</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/specialforest"><img src="https://avatars.githubusercontent.com/u/581410?v=4" width="100px;" alt=""/><br /><sub><b>Igor Shishkin</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/verdantburrito"><img src="https://avatars.githubusercontent.com/u/130576273?v=4" width="100px;" alt=""/><br /><sub><b>Burrito Verde</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jvanderwee"><img src="https://avatars.githubusercontent.com/u/3587922?v=4" width="100px;" alt=""/><br /><sub><b>Joseph Van der Wee</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://luizbon.com/"><img src="https://avatars.githubusercontent.com/u/292532?v=4" width="100px;" alt=""/><br /><sub><b>Luiz Bon</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://sanjay-rb.github.io/"><img src="https://avatars.githubusercontent.com/u/25894304?v=4" width="100px;" alt=""/><br /><sub><b>Sanjay Ramassery Babu</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/russrimm"><img src="https://avatars.githubusercontent.com/u/10841574?v=4" width="100px;" alt=""/><br /><sub><b>Russ Rimmerman [MSFT]</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rperez030"><img src="https://avatars.githubusercontent.com/u/38786330?v=4" width="100px;" alt=""/><br /><sub><b>Roberto Perez</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ShehabSherif0"><img src="https://avatars.githubusercontent.com/u/210266853?v=4" width="100px;" alt=""/><br /><sub><b>Shehab Sherif</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/beingsmit"><img src="https://avatars.githubusercontent.com/u/1781956?v=4" width="100px;" alt=""/><br /><sub><b>Smit Patel</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/StevenJV"><img src="https://avatars.githubusercontent.com/u/4377447?v=4" width="100px;" alt=""/><br /><sub><b>Steven Vore</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/subhashisbhowmikicpes"><img src="https://avatars.githubusercontent.com/u/233422801?v=4" width="100px;" alt=""/><br /><sub><b>Subhashis Bhowmik</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tlmii"><img src="https://avatars.githubusercontent.com/u/9613109?v=4" width="100px;" alt=""/><br /><sub><b>Tim Mulholland</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/niels9001"><img src="https://avatars.githubusercontent.com/u/9866362?v=4" width="100px;" alt=""/><br /><sub><b>Niels Laute</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://pasul.medium.com/"><img src="https://avatars.githubusercontent.com/u/8143332?v=4" width="100px;" alt=""/><br /><sub><b>Pavel Sulimau</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/PrimedPaul"><img src="https://avatars.githubusercontent.com/u/29710834?v=4" width="100px;" alt=""/><br /><sub><b>PrimedPaul</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/REAL-Madrid01"><img src="https://avatars.githubusercontent.com/u/65749290?v=4" width="100px;" alt=""/><br /><sub><b>Zhiqi Pu</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ramyashreeradix"><img src="https://avatars.githubusercontent.com/u/202798545?v=4" width="100px;" alt=""/><br /><sub><b>Ramyashree Shetty</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ZdaPhp"><img src="https://avatars.githubusercontent.com/u/15830419?v=4" width="100px;" alt=""/><br /><sub><b>ZdaPhp</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pigd0g"><img src="https://avatars.githubusercontent.com/u/16750317?v=4" width="100px;" alt=""/><br /><sub><b>pigd0g</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rahulbats"><img src="https://avatars.githubusercontent.com/u/627905?v=4" width="100px;" alt=""/><br /><sub><b>rahulbats</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/suyask-msft"><img src="https://avatars.githubusercontent.com/u/158708948?v=4" width="100px;" alt=""/><br /><sub><b>suyask-msft</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tagedeep"><img src="https://avatars.githubusercontent.com/u/43116939?v=4" width="100px;" alt=""/><br /><sub><b>tagedeep</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tinkeringDev"><img src="https://avatars.githubusercontent.com/u/31189972?v=4" width="100px;" alt=""/><br /><sub><b>tinkeringDev</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/travish"><img src="https://avatars.githubusercontent.com/u/169255?v=4" width="100px;" alt=""/><br /><sub><b>Travis Hill</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/utkarsh232005"><img src="https://avatars.githubusercontent.com/u/137105846?v=4" width="100px;" alt=""/><br /><sub><b>Utkarsh patrikar</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rbgmulmb"><img src="https://avatars.githubusercontent.com/u/27664402?v=4" width="100px;" alt=""/><br /><sub><b>Yauhen</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yiouli"><img src="https://avatars.githubusercontent.com/u/3508494?v=4" width="100px;" alt=""/><br /><sub><b>Yiou Li</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/yukidukie"><img src="https://avatars.githubusercontent.com/u/38450410?v=4" width="100px;" alt=""/><br /><sub><b>Yuki Omoto</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abhibavishi"><img src="https://avatars.githubusercontent.com/u/7823146?v=4" width="100px;" alt=""/><br /><sub><b>Abhi Bavishi</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/augustus-0"><img src="https://avatars.githubusercontent.com/u/113288678?v=4" width="100px;" alt=""/><br /><sub><b>augustus-0</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/codeHysteria28"><img src="https://avatars.githubusercontent.com/u/46035047?v=4" width="100px;" alt=""/><br /><sub><b>Branislav Buna</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/connerlambden"><img src="https://avatars.githubusercontent.com/u/9061871?v=4" width="100px;" alt=""/><br /><sub><b>connerlambden</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DavidARaygoza"><img src="https://avatars.githubusercontent.com/u/100718117?v=4" width="100px;" alt=""/><br /><sub><b>David Raygoza</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/dipievil"><img src="https://avatars.githubusercontent.com/u/5294742?v=4" width="100px;" alt=""/><br /><sub><b>Diego Porto Ritzel</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ericsche"><img src="https://avatars.githubusercontent.com/u/35633680?v=4" width="100px;" alt=""/><br /><sub><b>Eric Scherlinger</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/fatihdurgut"><img src="https://avatars.githubusercontent.com/u/4159116?v=4" width="100px;" alt=""/><br /><sub><b>Fatih</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://blog.fujiy.net/"><img src="https://avatars.githubusercontent.com/u/1336227?v=4" width="100px;" alt=""/><br /><sub><b>Felipe Pessoto</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://medium.com/just-tech-it-now"><img src="https://avatars.githubusercontent.com/u/1039390?v=4" width="100px;" alt=""/><br /><sub><b>François</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/GeoffreyCasaubon"><img src="https://avatars.githubusercontent.com/u/790606?v=4" width="100px;" alt=""/><br /><sub><b>Geoffrey Casaubon</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Anddd7"><img src="https://avatars.githubusercontent.com/u/24785373?v=4" width="100px;" alt=""/><br /><sub><b>Anddd7</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/anderseide"><img src="https://avatars.githubusercontent.com/u/13043472?v=4" width="100px;" alt=""/><br /><sub><b>Anders Eide</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://aymenfurter.ch/"><img src="https://avatars.githubusercontent.com/u/20464460?v=4" width="100px;" alt=""/><br /><sub><b>Aymen</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://kvz.io/"><img src="https://avatars.githubusercontent.com/u/26752?v=4" width="100px;" alt=""/><br /><sub><b>Kevin van Zonneveld</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/luiscantero"><img src="https://avatars.githubusercontent.com/u/1353540?v=4" width="100px;" alt=""/><br /><sub><b>Luis Cantero</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mvkaran"><img src="https://avatars.githubusercontent.com/u/8726608?v=4" width="100px;" alt=""/><br /><sub><b>MV Karan</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Jugger23"><img src="https://avatars.githubusercontent.com/u/144260728?v=4" width="100px;" alt=""/><br /><sub><b>Marcel Deutzer</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://weblogs.asp.net/jongalloway"><img src="https://avatars.githubusercontent.com/u/68539?v=4" width="100px;" alt=""/><br /><sub><b>Jon Galloway</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://jlbeard.com/"><img src="https://avatars.githubusercontent.com/u/4313198?v=4" width="100px;" alt=""/><br /><sub><b>Josh Beard</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://jpinzer.me/"><img src="https://avatars.githubusercontent.com/u/8357054?v=4" width="100px;" alt=""/><br /><sub><b>Julian</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/simonkurtz-MSFT"><img src="https://avatars.githubusercontent.com/u/84809797?v=4" width="100px;" alt=""/><br /><sub><b>Simon Kurtz</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TemitayoAfolabi"><img src="https://avatars.githubusercontent.com/u/108681158?v=4" width="100px;" alt=""/><br /><sub><b>Temitayo Afolabi</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/joeVenner"><img src="https://avatars.githubusercontent.com/u/61122897?v=4" width="100px;" alt=""/><br /><sub><b>JoeVenner</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/pasindudilshan1"><img src="https://avatars.githubusercontent.com/u/146967638?v=4" width="100px;" alt=""/><br /><sub><b>Pasindu Premarathna</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ecosystem"><img src="https://avatars.githubusercontent.com/u/2956973?v=4" width="100px;" alt=""/><br /><sub><b>ecosystem</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/punit-fastah"><img src="https://avatars.githubusercontent.com/u/257566774?v=4" width="100px;" alt=""/><br /><sub><b>Punit</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.youtube.com/@cloudarch"><img src="https://avatars.githubusercontent.com/u/44020466?v=4" width="100px;" alt=""/><br /><sub><b>Onur Senturk</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://mastodon.social/@andrewstellman"><img src="https://avatars.githubusercontent.com/u/7516297?v=4" width="100px;" alt=""/><br /><sub><b>Andrew Stellman</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.linkedin.com/in/jeonghlee8024"><img src="https://avatars.githubusercontent.com/u/18215249?v=4" width="100px;" alt=""/><br /><sub><b>Jeonghoon Lee</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://srisatyalokesh.is-a.dev/"><img src="https://avatars.githubusercontent.com/u/43106076?v=4" width="100px;" alt=""/><br /><sub><b>Satya K</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/samikroy"><img src="https://avatars.githubusercontent.com/u/20562985?v=4" width="100px;" alt=""/><br /><sub><b>Samik Roy</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/siminapasat"><img src="https://avatars.githubusercontent.com/u/16675781?v=4" width="100px;" alt=""/><br /><sub><b>Simina Pasat</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/garnertb"><img src="https://avatars.githubusercontent.com/u/1141646?v=4" width="100px;" alt=""/><br /><sub><b>Tyler Garner</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/cheguv"><img src="https://avatars.githubusercontent.com/u/21251550?v=4" width="100px;" alt=""/><br /><sub><b>Vijay Chegu</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/DTIBeograd"><img src="https://avatars.githubusercontent.com/u/30282550?v=4" width="100px;" alt=""/><br /><sub><b>DTIBeograd</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/behl1anmol"><img src="https://avatars.githubusercontent.com/u/37472462?v=4" width="100px;" alt=""/><br /><sub><b>Anmol Behl</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://aftermathtech.com/"><img src="https://avatars.githubusercontent.com/u/125813226?v=4" width="100px;" alt=""/><br /><sub><b>Brad Kinnard</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://felickz.github.io/"><img src="https://avatars.githubusercontent.com/u/1760475?v=4" width="100px;" alt=""/><br /><sub><b>Chad Bentz</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/MarcelloCuoghi"><img src="https://avatars.githubusercontent.com/u/10816095?v=4" width="100px;" alt=""/><br /><sub><b>Marcello Cuoghi</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://josh-ops.com/"><img src="https://avatars.githubusercontent.com/u/19912012?v=4" width="100px;" alt=""/><br /><sub><b>Josh Johanning</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jennyf19"><img src="https://avatars.githubusercontent.com/u/19942418?v=4" width="100px;" alt=""/><br /><sub><b>jennyf19</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/SaravananRajaraman"><img src="https://avatars.githubusercontent.com/u/5166323?v=4" width="100px;" alt=""/><br /><sub><b>Saravanan Rajaraman</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Dhruvpatel004"><img src="https://avatars.githubusercontent.com/u/109230666?v=4" width="100px;" alt=""/><br /><sub><b>Patel Dhruv </b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/reneenoble"><img src="https://avatars.githubusercontent.com/u/7269759?v=4" width="100px;" alt=""/><br /><sub><b>Renee Noble</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jjpinto"><img src="https://avatars.githubusercontent.com/u/16046674?v=4" width="100px;" alt=""/><br /><sub><b>jjpinto</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://moeyui1.github.io/"><img src="https://avatars.githubusercontent.com/u/11503525?v=4" width="100px;" alt=""/><br /><sub><b>moeyui1</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mohammadali2549"><img src="https://avatars.githubusercontent.com/u/67632698?v=4" width="100px;" alt=""/><br /><sub><b>mohammadali2549</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/proflead"><img src="https://avatars.githubusercontent.com/u/59716480?v=4" width="100px;" alt=""/><br /><sub><b>Vladislav Guzey</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/aparna198809"><img src="https://avatars.githubusercontent.com/u/99466930?v=4" width="100px;" alt=""/><br /><sub><b>aparna198809</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/TeddMcAdams"><img src="https://avatars.githubusercontent.com/u/15876990?v=4" width="100px;" alt=""/><br /><sub><b>Ed McAdams</b></sub></a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/eanders-tdy"><img src="https://avatars.githubusercontent.com/u/271782413?v=4" width="100px;" alt=""/><br /><sub><b>Emil Andersson</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.mikaelkrief.com/"><img src="https://avatars.githubusercontent.com/u/2725302?v=4" width="100px;" alt=""/><br /><sub><b>Mikael</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Mrigank005"><img src="https://avatars.githubusercontent.com/u/179711954?v=4" width="100px;" alt=""/><br /><sub><b>Mrigank Singh</b></sub></a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://www.jimbobbennett.dev/"><img src="https://avatars.githubusercontent.com/u/1710385?v=4" width="100px;" alt=""/><br /><sub><b>Jim Bennett</b></sub></a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## 📚 Additional Resources

- [VS Code Copilot Customization Documentation](https://code.visualstudio.com/docs/copilot/copilot-customization) - Official Microsoft documentation
- [GitHub Copilot Chat Documentation](https://code.visualstudio.com/docs/copilot/chat/copilot-chat) - Complete chat feature guide
- [VS Code Settings](https://code.visualstudio.com/docs/getstarted/settings) - General VS Code configuration guide

## ™️ Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
