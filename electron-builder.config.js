/** @type {import('electron-builder').Configuration} */
export default {
  appId: 'com.cc.config-gui',
  productName: 'CC Config GUI',
  copyright: 'Copyright © 2024 CC',
  directories: {
    buildResources: 'resources',
    output: 'dist'
  },
  files: [
    'out/**/*',
    '!out/**/*.map'
  ],
  mac: {
    target: [
      {
        target: 'dmg',
        arch: ['arm64', 'x64']
      }
    ],
    artifactName: '${productName}-${version}-${arch}.${ext}',
    category: 'public.app-category.utilities'
  },
  dmg: {
    title: '${productName} ${version}',
    artifactName: '${productName}-${version}-${arch}.${ext}'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}
