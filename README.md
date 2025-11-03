<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

AI-powered academic and career pathway recommendation API built with [NestJS](https://github.com/nestjs/nest). It exposes authentication, user management, and now an AI-driven roadmap generator powered by Google Gemini (Gemini 2.5 Flash).

## Roadmap Generator API

The roadmap generator creates actionable learning plans tailored to a user's target topic, experience level, pacing preference, and constraints. It integrates with Google Gemini via the `@google/genai` SDK.

### Environment Variables

Add the following variables to your `.env` file:

| Variable                  | Required | Default            | Description                                 |
| ------------------------- | -------- | ------------------ | ------------------------------------------- |
| `GENAI_API_KEY`           | ✅       | –                  | Google Gemini API key.                      |
| `GENAI_MODEL`             | ❌       | `gemini-2.5-flash` | Gemini model name to use.                   |
| `GENAI_TEMPERATURE`       | ❌       | `0.4`              | Controls creativity (0-2).                  |
| `GENAI_TOP_P`             | ❌       | `0.95`             | Nucleus sampling parameter (0-1).           |
| `GENAI_TOP_K`             | ❌       | `32`               | Limits candidate tokens considered (1-200). |
| `GENAI_MAX_OUTPUT_TOKENS` | ❌       | `32768`            | Maximum tokens in the response (1-8192).    |

### Endpoint

- `POST /roadmaps`
  - Requires a valid JWT (`Authorization: Bearer <token>`)
  - Body payload:

```json
{
  "topic": "Full-stack web developer",
  "experienceLevel": "beginner",
  "learningPace": "balanced",
  "background": "Computer science graduate with basic JavaScript",
  "targetOutcome": "Break into a junior front-end role",
  "timeframe": "6 months",
  "preferences": "Prefer project-based learning with open resources"
}
```

### Response

```json
{
  "topic": "Full-stack web developer",
  "experienceLevel": "beginner",
  "learningPace": "balanced",
  "timeframe": "6 months",
  "summary": {
    "recommendedCadence": "5-8 hours per week",
    "recommendedDuration": "5-6 months",
    "successTips": ["Track weekly goals", "Publish projects for feedback"],
    "additionalNotes": "Emphasize fundamentals before frameworks."
  },
  "phases": [
    {
      "title": "Foundations",
      "outcome": "Comfortably build responsive websites",
      "estimatedDuration": "6 weeks",
      "steps": [
        {
          "title": "Master semantic HTML and CSS",
          "description": "Learn layout systems, accessibility, and responsive design.",
          "estimatedDuration": "2 weeks",
          "keyActivities": [
            "Build a personal site",
            "Complete CSS Grid exercises"
          ],
          "resources": [
            {
              "type": "Video Course",
              "title": "freeCodeCamp Responsive Web Design",
              "url": "https://www.freecodecamp.org/learn/",
              "description": "Project-led curriculum for HTML, CSS, and accessibility."
            }
          ]
        }
      ]
    }
  ],
  "milestones": [
    {
      "title": "Launch responsive personal site",
      "successCriteria": "Site passes Lighthouse accessibility score of 90+."
    }
  ]
}
```

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
