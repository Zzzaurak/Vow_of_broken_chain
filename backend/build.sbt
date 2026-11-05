ThisBuild / scalaVersion := "3.3.5"
ThisBuild / version := "0.1.0"
libraryDependencies ++= Seq(
  "org.typelevel" %% "cats-effect" % "3.6.3",
  "org.http4s" %% "http4s-ember-server" % "0.23.30",
  "org.http4s" %% "http4s-dsl" % "0.23.30",
  "org.http4s" %% "http4s-circe" % "0.23.30",
  "io.circe" %% "circe-generic" % "0.14.10",
  "io.circe" %% "circe-parser" % "0.14.10",
  "org.postgresql" % "postgresql" % "42.7.5",
  "org.slf4j" % "slf4j-simple" % "2.0.16",
  "org.scalameta" %% "munit" % "1.0.3" % Test,
  "org.typelevel" %% "munit-cats-effect" % "2.0.0" % Test
)
Compile / run / fork := true
Compile / run / mainClass := Some("services.system.Main")
// Preserve JVM WARNING / SLF4J levels instead of labeling all stderr as [error].
// This does not filter messages or change failed process exit codes.
Compile / run / outputStrategy := Some(StdoutOutput)

Compile / resourceGenerators += Def.task {
  val source = baseDirectory.value.getParentFile / "content"
  val target = (Compile / resourceManaged).value / "content"
  IO.copyDirectory(source, target)
  (target ** "*.json").get
}.taskValue
