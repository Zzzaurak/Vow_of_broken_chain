package services.AdventureService.utils
import cats.effect.IO
import io.circe.{Json,parser}
import services.AdventureService.objects.*
import services.system.objects.ApiError
object Content:
  private[AdventureService] def maps: IO[Vector[Json]] = IO.blocking {
    val stream = Option(getClass.getResourceAsStream("/content/world/maps.json")).getOrElse(throw new IllegalStateException("Missing packaged maps"))
    stream
  }.bracket(s => IO.blocking(new String(s.readAllBytes(),java.nio.charset.StandardCharsets.UTF_8)))(s => IO.blocking(s.close())).flatMap(s => IO.fromEither(parser.parse(s))).map(_.asArray.getOrElse(Vector.empty))
  private[AdventureService] def initial(difficulty: Difficulty): GameSnapshot = GameSnapshot(1,"1.0.0",difficulty,"steps",Position(96,384),"steps",ProgressStage.arrival,Nil,Nil,Nil,100,100,Cooldowns(0,0,0,0),0)
  private[AdventureService] def validate(snapshot: GameSnapshot): IO[Unit] = maps.flatMap { catalog =>
    val ids = catalog.flatMap(_.hcursor.get[String]("id").toOption)
    val index = ids.indexOf(snapshot.mapId)
    val current = catalog.lift(index)
    val width = current.flatMap(_.hcursor.get[Int]("width").toOption).getOrElse(0)*32
    val height = current.flatMap(_.hcursor.get[Int]("height").toOption).getOrElse(0)*32
    val blocked = current.toList.flatMap(_.hcursor.get[List[List[Double]]]("obstacles").getOrElse(Nil)).exists {
      case List(x,y,w,h) => snapshot.position.x >= x-12 && snapshot.position.x <= x+w+12 && snapshot.position.y >= y-8 && snapshot.position.y <= y+h+8
      case _ => true
    }
    val expectedPartners = List(Partner.glm -> 3,Partner.gpt -> 7,Partner.claude -> 9).collect { case (id,at) if index > at || (index == at && snapshot.stage == ProgressStage.cleared) => id }
    val resources = List(snapshot.hp,snapshot.mp,snapshot.playSeconds,snapshot.position.x,snapshot.position.y,snapshot.cooldowns.water,snapshot.cooldowns.glm,snapshot.cooldowns.gpt,snapshot.cooldowns.claude)
    val allowedCompleted = catalog.take(index + (if snapshot.stage == ProgressStage.cleared then 1 else 0)).flatMap(_.hcursor.get[Option[String]]("encounter").getOrElse(None)).toSet
    val valid = snapshot.schemaVersion == 1 && snapshot.contentVersion == "1.0.0" && index >= 0 &&
      snapshot.checkpoint == snapshot.mapId &&
      resources.forall(v => v.isFinite && v >= 0) && snapshot.hp > 0 && snapshot.hp <= 100 && snapshot.mp <= 100 &&
      snapshot.position.x >= 24 && snapshot.position.x <= width-24 && snapshot.position.y >= 24 && snapshot.position.y <= height-24 && !blocked &&
      snapshot.unlocked.toSet == expectedPartners.toSet && snapshot.unlocked.distinct == snapshot.unlocked && snapshot.supports.size <= 2 && snapshot.supports.distinct == snapshot.supports && snapshot.supports.forall(snapshot.unlocked.contains) &&
      snapshot.completed.toSet == allowedCompleted && snapshot.completed.distinct == snapshot.completed &&
      (index != 10 || snapshot.supports.contains(Partner.claude)) && (snapshot.stage != ProgressStage.ending && snapshot.stage != ProgressStage.finished || index == 11) &&
      snapshot.cooldowns.water <= 4 && snapshot.cooldowns.glm <= 10 && snapshot.cooldowns.gpt <= 18 && snapshot.cooldowns.claude <= 16
    IO.raiseUnless(valid)(ApiError("invalid_snapshot","存档内容、资源或剧情阶段不一致，未覆盖已有记录。"))
  }
