/** @type {import('electron-builder').Configuration} */
export default {
  appId: 'com.cashcat.config-gui',
  productName: 'CashCat Config GUI',
  copyright: 'Copyright © 2024 CashCat',
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
