import { ChildProcess, spawn } from 'child_process';
import { cp, mkdir, rm } from 'fs/promises';
import { glob } from 'glob';
import { join } from 'path';
import { BuildType, PluginBuilder, type BuildMetadata } from './build';
import chokidar from 'chokidar';

const outputDirectoryString = join(process.cwd(), 'releases');
const corePluginsDirectoryString = join(process.cwd(), 'core/plugins');

const buildConfiguration: BuildMetadata = {
  path: 'plugins/*',
  type: BuildType.File,
  options: {
    entryFile: 'src/app.ts',
    outputDirectory: outputDirectoryString,
    /** Alinha o singleton do Constatic com o processo do core (ver `pluginBundleOptions` em release.ts). */
    buildArgs: ['--external=@ashu11a/constatic'],
  }
};

async function rebuildPlugins(): Promise<void> {
  await rm(outputDirectoryString, { recursive: true, force: true });
  await mkdir(outputDirectoryString, { recursive: true });
  await rm(corePluginsDirectoryString, { recursive: true, force: true });
  await mkdir(corePluginsDirectoryString, { recursive: true });

  const pluginPathsArray = await glob([buildConfiguration.path], { cwd: process.cwd() });

  for (const currentPath of pluginPathsArray) {
    buildConfiguration.path = currentPath;
    const pluginBuilderInstance = new PluginBuilder(buildConfiguration);
    await pluginBuilderInstance.build();
  }

  const generatedPluginsArray = await glob('plugin-*.js', { cwd: outputDirectoryString });

  for (const generatedPluginFile of generatedPluginsArray) {
    await cp(
      join(outputDirectoryString, generatedPluginFile),
      join(corePluginsDirectoryString, generatedPluginFile)
    );
  }
}

const RESTART_DELAY_MILLISECONDS = 400;

let isServerDirty: boolean = false;
let isPluginsDirty: boolean = false;
let isCoreDirty: boolean = false;
let watcherIsReady: boolean = false;

let restartTimerInstance: ReturnType<typeof setTimeout> | null = null;
let serverProcessInstance: ChildProcess | null = null;
let coreProcessInstance: ChildProcess | null = null;

const fileWatcher = chokidar.watch(
  ['server/**/*', 'core/**/*', 'plugins/**/*', 'packages/**/*'],
  {
    ignored: [
      'core/plugins',
      'devlop.ts',
      'plugins/*/src/register.ts',
      'plugins/*/entries.json',
      'core/entries',
      'core/locales',
      'server/database.wm',
      '**/node_modules/**',
      '**/.git/**',
    ],
  }
);

function killSpecificProcess(processToKill: ChildProcess | null): void {
  if (processToKill && !processToKill.killed) {
    processToKill.kill();
  }
}

function killAllProcesses(): void {
  console.log('Finalizando todos os processos filhos...');
  killSpecificProcess(serverProcessInstance);
  killSpecificProcess(coreProcessInstance);
}

function startServerProcess(): Promise<ChildProcess> {
  return new Promise<ChildProcess>((resolve, reject) => {
    const processInstance = spawn('bun', ['run', 'dev'], {
      cwd: join(process.cwd(), 'server'),
      stdio: ['inherit', 'pipe', 'pipe']
    });

    let isProcessSettled: boolean = false;

    function handleProcessError(dataBuffer: Buffer): void {
      const outputString = dataBuffer.toString();
      process.stdout.write(outputString);

      if (outputString.includes('EADDRINUSE') || outputString.includes('Failed to start server')) {
        if (!isProcessSettled) {
          isProcessSettled = true;
          reject(new Error(`Erro no servidor: ${outputString}`));
          killAllProcesses();
        }
      }
    }

    processInstance.stdout?.on('data', (dataBuffer: Buffer) => {
      const outputString = dataBuffer.toString();
      process.stdout.write(outputString);

      // Alterado para reconhecer os logs reais que o seu servidor emite
      const isServerReady = outputString.includes('successfully registered!') || outputString.includes('Bun Inspector');

      if (isServerReady && !isProcessSettled) {
        isProcessSettled = true;
        resolve(processInstance);
      }
    });

    processInstance.stderr?.on('data', handleProcessError);

    processInstance.on('error', (errorInstance: Error) => {
      if (!isProcessSettled) {
        isProcessSettled = true;
        reject(errorInstance);
        killAllProcesses();
      }
    });

    processInstance.on('exit', (exitCodeNumber) => {
      console.log(`Servidor finalizado com código ${exitCodeNumber}`);
      if (exitCodeNumber !== 0 && !isProcessSettled) {
        isProcessSettled = true;
        reject(new Error(`Servidor finalizou com código ${exitCodeNumber}`));
        killAllProcesses();
      } else if (exitCodeNumber !== 0) {
        killAllProcesses();
      }
    });
  });
}

function startCoreProcess(): ChildProcess {
  const processInstance = spawn('bun', ['run', 'dev'], {
    cwd: join(process.cwd(), 'core'),
    stdio: 'inherit'
  });

  processInstance.on('exit', (exitCodeNumber) => {
    console.log(`Core finalizado com código ${exitCodeNumber}`);
    if (exitCodeNumber !== 0) {
      killAllProcesses();
    }
  });

  return processInstance;
}

async function applyModularChanges(): Promise<void> {
  const shouldRestartServer = isServerDirty;
  const shouldRebuildPlugins = isPluginsDirty;
  const shouldRestartCore = isCoreDirty || isPluginsDirty;

  isServerDirty = false;
  isPluginsDirty = false;
  isCoreDirty = false;

  try {
    if (shouldRestartServer) {
      console.log('[devlop] Alteração no servidor detectada. Reinicializando apenas o servidor...');
      killSpecificProcess(serverProcessInstance);
      serverProcessInstance = await startServerProcess();
    }

    if (shouldRebuildPlugins) {
      console.log('[devlop] Alteração em plugins ou pacotes detectada. Reconstruindo...');
      await rebuildPlugins();
    }

    if (shouldRestartCore) {
      console.log('[devlop] Reinicializando o core...');
      killSpecificProcess(coreProcessInstance);
      coreProcessInstance = startCoreProcess();
    }
  } catch (errorInstance: unknown) {
    console.error('Erro ao aplicar as alterações:', errorInstance);
    killAllProcesses();
  }
}

async function initializeDevelopmentStack(): Promise<void> {
  try {
    console.log('[devlop] Inicializando ambiente de desenvolvimento...');
    await rebuildPlugins();
    serverProcessInstance = await startServerProcess();
    coreProcessInstance = startCoreProcess();
  } catch (errorInstance: unknown) {
    console.error('Erro durante a inicialização:', errorInstance);
    killAllProcesses();
  }
}

fileWatcher.on('ready', () => {
  watcherIsReady = true;
});

fileWatcher.on('all', (eventNameString, filePathString) => {
  if (!watcherIsReady) return;

  const validEventsArray = ['add', 'change', 'unlink', 'addDir', 'unlinkDir'];
  if (!validEventsArray.includes(eventNameString)) return;

  const normalizedPathString = filePathString.replace(/\\/g, '/');
  const currentWorkingDirectoryString = process.cwd().replace(/\\/g, '/');
  
  const relativePathString = normalizedPathString.startsWith(currentWorkingDirectoryString)
    ? normalizedPathString.slice(currentWorkingDirectoryString.length).replace(/^\//, '')
    : normalizedPathString;

  if (relativePathString.startsWith('server/')) {
    isServerDirty = true;
  } else if (relativePathString.startsWith('plugins/') || relativePathString.startsWith('packages/')) {
    isPluginsDirty = true;
  } else if (relativePathString.startsWith('core/')) {
    isCoreDirty = true;
  }

  if (restartTimerInstance) clearTimeout(restartTimerInstance);

  restartTimerInstance = setTimeout(() => {
    restartTimerInstance = null;
    void applyModularChanges();
  }, RESTART_DELAY_MILLISECONDS);
});

void initializeDevelopmentStack();