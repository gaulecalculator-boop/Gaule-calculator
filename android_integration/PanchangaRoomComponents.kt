package com.ghaule.calculator.data.panchanga

import android.content.Context
import androidx.room.*
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.InputStreamReader

/**
 * Android Room Entity for Offline Panchanga Records
 * Maps 1:1 with Mero Miti Panchanga API & Complete_Nepali_Panchanga_2083_2085.json
 */
@Entity(
    tableName = "panchanga_records",
    indices = [
        Index(value = ["year", "month", "gate"], unique = true),
        Index(value = ["englishDate"]),
        Index(value = ["year", "isHoliday"]),
        Index(value = ["year", "month", "tithi"])
    ]
)
data class PanchangaEntity(
    @PrimaryKey
    val id: Long,
    val year: Int,
    val month: Int,
    val gate: Int,
    val baar: String,
    val tithi: String,
    val tithiGhaPa: String?,
    val tithiEnds: String?,
    val nakshatra: String?,
    val nakshatraGhaPa: String?,
    val nakshatraEnds: String?,
    val yoga: String?,
    val yogaGhaPa: String?,
    val yogaEnds: String?,
    val karana: String?,
    val karanaGhaPa: String?,
    val karanaEnds: String?,
    val moonSign: String?,
    val dinMaan: String?,
    val sunrise: String,
    val sunset: String,
    val englishDate: String,
    val festivals: String?,
    val isHoliday: Boolean,
    val iconUrl: String?,
    val bgUrl: String?,
    val dailyLagan: String?,
    val planetary: String?,
    val tithiName: String?,
    val nakshatraName: String?,
    val pakshya: String?,
    val pakshyaEn: String?,
    val isShukla: Boolean,
    val chandraRashi: String?,
    val chandraRashiEn: String?,
    val rashiName: String?,
    val rashiBefore: String?,
    val rashiAfter: String?,
    val rashiTransitionTime: String?,
    val rashiTransitionTimeNe: String?,
    val isTransitionDay: Boolean
)

/**
 * Room Data Access Object (DAO) for Fast Offline Queries
 */
@Dao
interface PanchangaDao {

    @Query("SELECT * FROM panchanga_records WHERE year = :year AND month = :month AND gate = :gate LIMIT 1")
    suspend fun getRecordByBSDate(year: Int, month: Int, gate: Int): PanchangaEntity?

    @Query("SELECT * FROM panchanga_records WHERE englishDate = :englishDate LIMIT 1")
    suspend fun getRecordByADDate(englishDate: String): PanchangaEntity?

    @Query("SELECT * FROM panchanga_records WHERE year = :year AND month = :month ORDER BY gate ASC")
    suspend fun getMonthRecords(year: Int, month: Int): List<PanchangaEntity>

    @Query("SELECT * FROM panchanga_records WHERE year = :year AND isHoliday = 1 ORDER BY month ASC, gate ASC")
    suspend fun getHolidaysByYear(year: Int): List<PanchangaEntity>

    @Query("SELECT * FROM panchanga_records WHERE year = :year AND festivals IS NOT NULL AND festivals != '' ORDER BY month ASC, gate ASC")
    suspend fun getFestivalsByYear(year: Int): List<PanchangaEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(records: List<PanchangaEntity>)

    @Query("SELECT COUNT(*) FROM panchanga_records")
    suspend fun getTotalRecordsCount(): Int
}

/**
 * Room Database Definition
 */
@Database(entities = [PanchangaEntity::class], version = 1, exportSchema = false)
abstract class PanchangaDatabase : RoomDatabase() {
    abstract fun panchangaDao(): PanchangaDao

    companion object {
        @Volatile
        private var INSTANCE: PanchangaDatabase? = null

        fun getDatabase(context: Context): PanchangaDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    PanchangaDatabase::class.java,
                    "ghaule_panchanga.db"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}

/**
 * Fast Asset JSON Importer to pre-populate Room Database from app assets
 */
object PanchangaJsonImporter {

    suspend fun importFromAssets(context: Context, database: PanchangaDatabase): Int = withContext(Dispatchers.IO) {
        val dao = database.panchangaDao()
        val currentCount = dao.getTotalRecordsCount()
        if (currentCount > 0) {
            return@withContext currentCount // Already imported
        }

        context.assets.open("BS_2083.json").use { inputStream ->
            val reader = InputStreamReader(inputStream, "UTF-8")
            val gson = Gson()
            val jsonObject = gson.fromJson(reader, com.google.gson.JsonObject::class.java)
            val monthsArray = jsonObject.getAsJsonArray("months")

            val entities = mutableListOf<PanchangaEntity>()
            for (monthElement in monthsArray) {
                val monthObj = monthElement.asJsonObject
                val dataArray = monthObj.getAsJsonArray("data")
                val monthEntitiesType = object : TypeToken<List<PanchangaEntity>>() {}.type
                val parsed: List<PanchangaEntity> = gson.fromJson(dataArray, monthEntitiesType)
                entities.addAll(parsed)
            }

            dao.insertAll(entities)
            return@withContext entities.size
        }
    }
}
