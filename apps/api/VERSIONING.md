# Semantic Versioning Strategy

This project follows [Semantic Versioning 2.0.0](https://semver.org/).

## Version Format

```
MAJOR.MINOR.PATCH[-prerelease]
```

Examples:
- `1.2.3` - Release version
- `1.2.3-beta.1` - Pre-release version

## Version Bump Guidelines

### MAJOR (X.0.0)
Increment when:
- Breaking API changes
- Database schema migrations requiring manual intervention
- Removal of deprecated features
- Changes requiring client updates

### MINOR (x.X.0)
Increment when:
- New features added (backward compatible)
- Deprecating existing functionality (but not removing)
- Significant internal refactoring with no breaking changes

### PATCH (x.x.X)
Increment when:
- Bug fixes
- Security patches
- Performance improvements
- Documentation updates

## Pre-release Tags

Use pre-release tags for testing before official releases:
- `v1.0.0-alpha.1` - Early testing
- `v1.0.0-beta.1` - Feature complete, testing phase
- `v1.0.0-rc.1` - Release candidate

## Docker Image Tagging

Each release produces Docker images tagged with:
- `latest` - Always points to the most recent release
- `v{major}` - e.g., `v1` - Latest in major version
- `v{major}.{minor}` - e.g., `v1.2` - Latest in minor version  
- `v{major}.{minor}.{patch}` - e.g., `v1.2.3` - Specific version

## Release Process

1. Update `VERSION` file with new version number
2. Update `CHANGELOG.md` with changes
3. Commit changes: `git commit -am "Release vX.Y.Z"`
4. Create tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
5. Push: `git push && git push --tags`
6. CI/CD will automatically build and tag Docker images

## Version File

The `VERSION` file in the repository root contains the current version number (without the 'v' prefix).

