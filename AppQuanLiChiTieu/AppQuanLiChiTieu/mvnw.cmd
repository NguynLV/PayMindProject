@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.2.0
@REM
@REM Licensed to the Apache Software Foundation (ASF) under one
@REM or more contributor license agreements.  See the NOTICE file
@REM distributed with this work for additional information
@REM regarding copyright ownership.  The ASF licenses this file
@REM to you under the Apache License, Version 2.0 (the
@REM "License"); you may not use this file except in compliance
@REM with the License.  You may obtain a copy of the License at
@REM
@REM    http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing,
@REM software distributed under the License is distributed on an
@REM "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
@REM KIND, either express or implied.  See the License for the
@REM specific language governing permissions and limitations
@REM under the License.
@REM ----------------------------------------------------------------------------

@IF "%DEBUG%"=="on" @ECHO ON
@setlocal

set ERROR_CODE=0

@REM To isolate internal variables from possible porting issues, separate codes into groups

@REM ==== START VALIDATION ====
@REM Check for JAVA_HOME
if not "%JAVA_HOME%"=="" goto OkJHome
for %%i in (java.exe) do set "JAVACMD=%%~$PATH:i"
if "%JAVACMD%"=="" (
  echo Error: JAVA_HOME is not defined and no 'java' command could be found in your PATH. >&2
  set ERROR_CODE=1
  goto end
)
goto OkJCmd

:OkJHome
set "JAVACMD=%JAVA_HOME%\bin\java.exe"

:OkJCmd
@REM ==== END VALIDATION ====

@REM Find the project base dir, i.e. the directory that contains the folder ".mvn".
@REM Fallback to current working directory if not found.

set "MAVEN_PROJECTBASEDIR=%MAVEN_BASEDIR%"
if not "%MAVEN_PROJECTBASEDIR%"=="" goto endReadBaseDir

set "MAVEN_PROJECTBASEDIR=%CD%"
:findBaseDir
if exist "%MAVEN_PROJECTBASEDIR%\.mvn" goto endReadBaseDir
set "MAVEN_PROJECTBASEDIR_BEFORE=%MAVEN_PROJECTBASEDIR%"
for %%i in ("%MAVEN_PROJECTBASEDIR%") do set "MAVEN_PROJECTBASEDIR=%%~dpi"
set "MAVEN_PROJECTBASEDIR=%MAVEN_PROJECTBASEDIR:~0,-1%"
if "%MAVEN_PROJECTBASEDIR%"=="%MAVEN_PROJECTBASEDIR_BEFORE%" (
  set "MAVEN_PROJECTBASEDIR=%CD%"
  goto endReadBaseDir
)
goto findBaseDir

:endReadBaseDir

set "WRAPPER_JAR=%MAVEN_PROJECTBASEDIR%\.mvn\wrapper\maven-wrapper.jar"
set "WRAPPER_LAUNCHER=org.apache.maven.wrapper.MavenWrapperMain"

"%JAVACMD%" ^
  %JAVA_OPTS% ^
  %MAVEN_OPTS% ^
  -classpath "%WRAPPER_JAR%" ^
  "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECTBASEDIR%" ^
  %WRAPPER_LAUNCHER% %MAVEN_CONFIG% %*
if ERRORLEVEL 1 set ERROR_CODE=1

:end
@endlocal & set ERROR_CODE=%ERROR_CODE%

if not "%MAVEN_SKIP_RC%"=="" goto skipArgs
@REM check for windows nt usage
if "x%OS%"=="xWindows_NT" goto xArgs
goto skipArgs

:xArgs
:skipArgs

exit /B %ERROR_CODE%
