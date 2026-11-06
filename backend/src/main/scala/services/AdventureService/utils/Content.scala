package services.AdventureService.utils

import cats.effect.{IO, Resource}
import io.circe.{Decoder, parser}
import java.nio.charset.StandardCharsets
import services.AdventureService.objects.*
import services.system.objects.ApiError

object Content:
  private def resource[A: Decoder](path: String): IO[A] =
    Resource.fromAutoCloseable(IO.blocking {
      Option(getClass.getResourceAsStream(path))
        .getOrElse(throw new IllegalStateException(s"Missing packaged resource: $path"))
    }).use(stream => IO.blocking(new String(stream.readAllBytes(), StandardCharsets.UTF_8)))
      .flatMap(text => IO.fromEither(parser.decode[A](text)))

  private[AdventureService] def maps: IO[List[MapDefinition]] =
    resource[List[MapDefinition]]("/content/world/maps.json")

  private[AdventureService] def regions: IO[List[RegionDefinition]] =
    resource[List[RegionDefinition]]("/content/world/exploration.json")

  private[AdventureService] def upgrade(snapshot: GameSnapshot): IO[GameSnapshot] =
    if snapshot.contentVersion != "1.1.0" then IO.pure(snapshot)
    else for
      manifest <- resource[ContentManifest]("/content/manifest.json")
      catalog <- maps
      order = List("steps", "market", "forest", "harbor", "coast", "crystal", "pass", "lair", "corridor", "garden", "throne", "alley")
      index = order.indexOf(snapshot.mapId)
      visited = order.take(index + 1)
      flags = visited.map(_ + ":arrival") ++
        (if index >= 2 then List("qwen") else Nil) ++
        (if index >= 3 then List("sluice", "bridge") else Nil)
      destination = if snapshot.mapId == "harbor" then "warehouse" else snapshot.mapId
      current <- IO.fromOption(catalog.find(_.id == destination))(ApiError("invalid_snapshot", "旧存档地图不存在。"))
      position = if destination != snapshot.mapId then Position(current.spawn.headOption.getOrElse(96.0), current.spawn.drop(1).headOption.getOrElse(96.0)) else snapshot.position
      // Grant only the old linear route's narrative prerequisites, never optional treasures.
      progress = ExplorationProgress((visited ++ List(destination) ++ (if index >= 3 then List("dock", "warehouse") else Nil)).distinct, flags, Nil)
    yield snapshot.copy(contentVersion = manifest.contentVersion, mapId = destination, checkpoint = destination, position = position, exploration = progress)

  private[AdventureService] def initial(difficulty: Difficulty): IO[GameSnapshot] =
    for
      manifest <- resource[ContentManifest]("/content/manifest.json")
      catalog <- maps
      first <- IO.fromOption(catalog.headOption)(new IllegalStateException("Empty world"))
      position <- IO.fromOption(first.spawn match
        case List(x, y) => Some(Position(x, y))
        case _ => None
      )(new IllegalStateException("Invalid spawn point"))
    yield GameSnapshot(manifest.schemaVersion, manifest.contentVersion, difficulty, first.id,
      position, first.checkpoint, ProgressStage.arrival, Nil, Nil, Nil,
      100, 100, Cooldowns(0, 0, 0, 0), 0, ExplorationProgress(List(first.id), Nil, Nil))

  private[AdventureService] def validate(snapshot: GameSnapshot): IO[Unit] =
    for
      manifest <- resource[ContentManifest]("/content/manifest.json")
      _ <- IO.raiseUnless(snapshot.schemaVersion == manifest.schemaVersion && snapshot.contentVersion == manifest.contentVersion)(
        ApiError("incompatible_save", "存档版本与当前游戏内容不兼容，请使用对应版本读取。"))
      catalog <- maps
      index = catalog.indexWhere(_.id == snapshot.mapId)
      current <- IO.fromOption(catalog.lift(index))(ApiError("invalid_snapshot", "存档场景不存在。"))
      blocked = current.obstacles.exists {
        case List(x, y, width, height) =>
          snapshot.position.x >= x - 12 && snapshot.position.x <= x + width + 12 &&
            snapshot.position.y >= y - 8 && snapshot.position.y <= y + height + 8
        case _ => true
      }
      world <- regions
      growth <- resource[List[GrowthItem]]("/content/balance/growth.json")
      region <- IO.fromOption(world.find(_.mapId == current.id))(ApiError("invalid_snapshot", "探索区域不存在。"))
      progress = snapshot.exploration
      conditions = snapshot.completed.toSet ++ progress.flags.toSet
      points = world.flatMap(r => r.points.map(p => (r.mapId, p)))
      knownFlags = points.map(_._2.id).toSet ++ catalog.map(_.id + ":arrival")
      rewards = points.filter(p => progress.collected.contains(p._2.id)).flatMap(p => growth.find(g => p._2.reward.contains(g.id)))
      maxHp = 100 + rewards.map(_.hp).sum
      maxMp = 100 + rewards.map(_.mp).sum
      completedMaps = catalog.filter(m => m.encounter.exists(snapshot.completed.contains))
      expectedPartners = completedMaps.flatMap(_.unlock).toSet
      knownEncounters = catalog.flatMap(_.encounter).toSet
      blockedMechanism = region.points.filter(p => !progress.flags.contains(p.id)).flatMap(_.blocker).exists {
        case List(x, y, width, height) => snapshot.position.x >= x - 12 && snapshot.position.x <= x + width + 12 &&
          snapshot.position.y >= y - 8 && snapshot.position.y <= y + height + 8
        case _ => true
      }
      validProgress = region.requires.forall(conditions.contains) &&
        progress.visited.contains(current.id) && progress.visited.distinct == progress.visited &&
        progress.visited.forall(id => world.exists(r => r.mapId == id && r.requires.forall(conditions.contains))) &&
        progress.flags.distinct == progress.flags && progress.flags.forall(knownFlags.contains) &&
        points.filter(p => progress.flags.contains(p._2.id)).forall { case (mapId, point) =>
          progress.visited.contains(mapId) && point.requires.forall(conditions.contains)
        } &&
        progress.flags.filter(_.endsWith(":arrival")).forall(flag => progress.visited.contains(flag.stripSuffix(":arrival"))) &&
        progress.collected.distinct == progress.collected &&
        progress.collected.forall(id => points.exists { case (mapId, point) =>
          point.id == id && point.reward.nonEmpty && progress.visited.contains(mapId) &&
            progress.flags.contains(id) && point.requires.forall(conditions.contains)
        }) &&
        snapshot.completed.forall(knownEncounters.contains) &&
        completedMaps.forall(m => world.exists(r => r.mapId == m.id && r.requires.forall(conditions.contains))) &&
        current.encounter.forall(id => (snapshot.stage == ProgressStage.cleared) == snapshot.completed.contains(id))
      resources = List(snapshot.hp, snapshot.mp, snapshot.playSeconds, snapshot.position.x,
        snapshot.position.y, snapshot.cooldowns.water, snapshot.cooldowns.glm,
        snapshot.cooldowns.gpt, snapshot.cooldowns.claude)
      endingStage = snapshot.stage == ProgressStage.ending || snapshot.stage == ProgressStage.finished
      valid = snapshot.checkpoint == current.checkpoint &&
        resources.forall(value => value.isFinite && value >= 0) &&
        snapshot.hp > 0 && snapshot.hp <= maxHp && snapshot.mp <= maxMp && validProgress && !blockedMechanism &&
        snapshot.position.x >= 24 && snapshot.position.x <= current.width * manifest.tileSize - 24 &&
        snapshot.position.y >= 24 && snapshot.position.y <= current.height * manifest.tileSize - 24 && !blocked &&
        snapshot.unlocked.toSet == expectedPartners && snapshot.unlocked.distinct == snapshot.unlocked &&
        snapshot.supports.size <= 2 && snapshot.supports.distinct == snapshot.supports &&
        snapshot.supports.forall(snapshot.unlocked.contains) &&
        snapshot.completed.distinct == snapshot.completed &&
        (!current.finalPreparation || snapshot.supports.headOption.contains(Partner.claude)) &&
        (endingStage == (current.id == "alley")) &&
        snapshot.cooldowns.water <= 4 && snapshot.cooldowns.glm <= 10 &&
        snapshot.cooldowns.gpt <= 18 && snapshot.cooldowns.claude <= 16
      _ <- IO.raiseUnless(valid)(ApiError("invalid_snapshot", "存档内容、资源或剧情阶段不一致，未覆盖已有记录。"))
    yield ()
