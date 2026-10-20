# Contributing

Thank you for helping improve Open Resume Lab.

1. Search existing issues and open one for substantial changes.
2. Fork the repository and create a focused branch.
3. Run `npm test`, `npm run lint` and `npm run build`.
4. Add tests for behavioral changes.
5. Explain privacy, fairness and compatibility effects in the pull request.

Never commit real resumes, API keys, model files or personal information. Synthetic fixtures must use reserved domains such as `example.com` and clearly invented organizations.

By contributing, you agree that your contribution is licensed under Apache License 2.0.


## Documentation and progress belong to the change

- Update README and relevant technical/setup/privacy docs in the same change when behavior, configuration or capabilities change.
- Update [project progress](docs/progress.md) with implemented work, actual validation, known errors and next steps. Separate implemented capability from measured evidence.
- Keep the approved [Chinese resume](docs/resume-project-zh.txt) and [STAR/interview preparation](docs/STAR-resume-zh.txt) aligned with implementation and recorded results. Explain category-policy mapping, dataset size/provenance, baselines and conditional local processing accurately.
- Preserve historical reports, failures, model outputs and frozen evaluation protocols. New measurements need new output files and actual model execution; documentation edits do not constitute a rerun.
- For documentation-only changes, check local links, source constants, measured counts and synchronized copies. Run the applicable code tests when behavior changes, and record which checks were actually performed.
