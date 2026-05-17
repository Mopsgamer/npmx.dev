import type { RouteLocationRaw } from 'vue-router'
import { splitPackageName } from '~/utils/package-name'

export function packageRoute(
  packageName: string,
  version?: string | null,
  hash?: string,
): RouteLocationRaw {
  const { org, name } = splitPackageName(packageName)

  if (version) {
    return {
      name: 'package-version',
      params: {
        org,
        name,
        // remove spaces to be correctly resolved by router
        version: version.replace(/\s+/g, ''),
      },
      hash,
    }
  }

  return {
    name: 'package',
    params: {
      org,
      name,
    },
  }
}

/** Full package-sizes page (`/package-sizes/{name}/v/{ver}`) */
export function getSizeRoute(name: string, ver: string): RouteLocationRaw {
  const { org, name: pkgName } = splitPackageName(name)
  return {
    name: 'package-sizes',
    params: {
      org: org || undefined,
      packageName: pkgName,
      version: ver,
    },
  }
}

/** Full version history page (`/package/.../versions`) */
export function packageVersionsRoute(packageName: string): RouteLocationRaw {
  const [org, name = ''] = packageName.startsWith('@') ? packageName.split('/') : ['', packageName]
  return { name: 'package-versions', params: { org, name } }
}

export function diffRoute(
  packageName: string,
  fromVersion: string,
  toVersion: string,
): RouteLocationRaw {
  const { org, name } = splitPackageName(packageName)

  return {
    name: 'diff',
    params: {
      org: org || undefined,
      packageName: name,
      versionRange: `${fromVersion}...${toVersion}`,
    },
  }
}

export function changelogRoute(
  packageName: string,
  version?: string | null,
  hash?: string,
): RouteLocationRaw {
  const [org, name = ''] = packageName.startsWith('@') ? packageName.split('/') : ['', packageName]

  if (version) {
    return {
      name: 'changelog-version',
      params: {
        org,
        name,
        // remove spaces to be correctly resolved by router
        version: version.replace(/\s+/g, ''),
      },
      hash,
    }
  }

  return {
    name: 'changelog',
    params: {
      org,
      name,
    },
  }
}

export function packageTimelineRoute(packageName: string, version: string): RouteLocationRaw {
  const { org, name } = splitPackageName(packageName)

  return {
    name: 'timeline',
    params: {
      org: org || undefined,
      packageName: name,
      version: version.replace(/\s+/g, ''),
    },
  }
}
