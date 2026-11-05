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
      100, 100, Cooldowns(0, 0, 0, 0), 0)

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
      completedMaps = catalog.take(index + (if snapshot.stage == ProgressStage.cleared then 1 else 0))
      expectedPartners = completedMaps.flatMap(_.unlock).toSet
      expectedEncounters = completedMaps.flatMap(_.encounter).toSet
      resources = List(snapshot.hp, snapshot.mp, snapshot.playSeconds, snapshot.position.x,
        snapshot.position.y, snapshot.cooldowns.water, snapshot.cooldowns.glm,
        snapshot.cooldowns.gpt, snapshot.cooldowns.claude)
      valid = snapshot.checkpoint == current.checkpoint &&
        resources.forall(value => value.isFinite && value >= 0) &&
        snapshot.hp > 0 && snapshot.hp <= 100 && snapshot.mp <= 100 &&
        snapshot.position.x >= 24 && snapshot.position.x <= current.width * manifest.tileSize - 24 &&
        snapshot.position.y >= 24 && snapshot.position.y <= current.height * manifest.tileSize - 24 && !blocked &&
        snapshot.unlocked.toSet == expectedPartners && snapshot.unlocked.distinct == snapshot.unlocked &&
        snapshot.supports.size <= 2 && snapshot.supports.distinct == snapshot.supports &&
        snapshot.supports.forall(snapshot.unlocked.contains) &&
        snapshot.completed.toSet == expectedEncounters && snapshot.completed.distinct == snapshot.completed &&
        (!current.finalPreparation || snapshot.supports.headOption.contains(Partner.claude)) &&
        ((snapshot.stage != ProgressStage.ending && snapshot.stage != ProgressStage.finished) || current.next.isEmpty) &&
        snapshot.cooldowns.water <= 4 && snapshot.cooldowns.glm <= 10 &&
        snapshot.cooldowns.gpt <= 18 && snapshot.cooldowns.claude <= 16
      _ <- IO.raiseUnless(valid)(ApiError("invalid_snapshot", "存档内容、资源或剧情阶段不一致，未覆盖已有记录。"))
    yield ()
