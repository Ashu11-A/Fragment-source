import SemVer from 'semver'
import type { Dependency, VersionOptions } from '../types/version'

export class Version {
  compatible: Dependency[] = []
  incompatible: Dependency[] = []

  constructor(options: VersionOptions) {
    const { mainPackage, dependencies } = options

    dependencies.forEach((dependency) => {
      if (SemVer.satisfies(dependency.version, `^${mainPackage.version}`)) {
        this.compatible.push(dependency)
      } else {
        this.incompatible.push(dependency)
      }
    })
  }
}
