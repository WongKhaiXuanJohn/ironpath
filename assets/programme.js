const e=(id,name,sets,min,max,trial,muscle,cue,loadType='kg',increment=2.5)=>({id,name,sets,min,max,trial,muscle,cue,loadType,increment});
export const programme=[
 {day:'Monday',short:'MON',title:'Build your upper body.',focus:'Chest, shoulders, triceps & abs',time:'65–80 min',tag:'Chest priority',note:'Bench first. Use 2–4 progressive warm-up sets, then work with 2–3 clean reps in reserve.',exercises:[
 e('bench','Barbell Bench Press',3,6,8,'40–60 kg','Chest','Set your feet, brace and keep a stable upper back. Lower under control; use safeties or a spotter.'),
 e('incline-db','Incline Dumbbell Press',3,8,12,'12–20 kg / hand','Chest','Use a comfortable incline and controlled range. Keep your elbows and shoulders comfortable.','kg',1),
 e('supported-row-mon','Chest-Supported Row',2,8,12,'20–40 kg','Back','Keep your chest on the pad. Pull through the elbows without throwing the torso back.'),
 e('fly','Cable Chest Fly',2,12,15,'5–12 kg / side','Chest','Maintain a soft elbow bend. Bring your arms together smoothly without momentum.'),
 e('lateral-mon','Dumbbell Lateral Raise',3,12,20,'4–8 kg / hand','Shoulders','Raise with control. Avoid shrugging or swinging; use the smallest practical increase.','kg',1),
 e('pushdown-mon','Rope Triceps Pushdown',3,10,15,'15–30 kg','Triceps','Keep elbows close to your sides and extend without rocking the torso.'),
 e('captain','Captain’s Chair Knee Raise',3,10,15,'Bodyweight','Abs','Support your forearms, keep the torso mostly stable and curl your pelvis toward your ribs at the top. A slight forward lean is fine. Lower without swinging.','bodyweight')
 ]},
 {day:'Tuesday',short:'TUE',title:'Lay the strength foundation.',focus:'Squat, overhead press & deadlift',time:'55–70 min',tag:'Strength priority',note:'Alternate emphasis weekly: A = squat ~2 RIR, deadlift 3–4 RIR. B = squat 3–4 RIR, deadlift ~2 RIR. Never max both.',exercises:[
 e('squat','Barbell Back Squat',3,4,6,'50–75 kg','Quads','Brace before each rep. Use progressive ramp-up sets and a controlled depth you can maintain.'),
 e('ohp','Standing Barbell Overhead Press',3,5,8,'20–35 kg','Shoulders','Brace your trunk and avoid excessive back extension as the bar passes your face.'),
 e('deadlift','Conventional Deadlift',2,3,5,'60–90 kg','Posterior chain','Set up consistently and brace. Stop the set if spine position or technique degrades.'),
 e('curl-tue','Seated Leg Curl',2,10,15,'20–40 kg','Hamstrings','Keep your hips against the seat and control the return.'),
 e('calf-tue','Standing Calf Raise',3,10,15,'30–60 kg','Calves','Use a controlled full range and pause rather than bouncing.')
 ]},
 {day:'Wednesday',short:'WED',title:'Build a stronger V-taper.',focus:'Back, biceps, rear delts & abs',time:'65–80 min',tag:'Back priority',note:'Supported rows limit spinal loading after Tuesday. Progress hanging raises only when you can control the movement.',exercises:[
 e('pullup','Pull-Ups / Assisted Pull-Ups',3,6,10,'Bodyweight / assisted','Back','Use enough assistance for at least six clean reps. Reduce assistance gradually before adding external load.','assisted'),
 e('supported-row-wed','Chest-Supported Row',3,8,12,'25–45 kg','Back','Keep the chest supported and pull through the elbows without jerking.'),
 e('pulldown','Neutral-Grip Lat Pulldown',2,8,12,'30–50 kg','Back','Pull toward the upper chest with a stable torso. Control the stretch at the top.'),
 e('reverse-pec','Reverse Pec Deck',3,12,20,'15–30 kg','Shoulders','Lead through the elbows and avoid shrugging. Keep the movement controlled.'),
 e('ez-curl','EZ-Bar Biceps Curl',3,8,12,'15–25 kg total','Biceps','Keep the upper arms still. Lower slowly through a comfortable full range.'),
 e('hammer','Dumbbell Hammer Curl',3,10,15,'7–12 kg / hand','Biceps','Keep a neutral grip and avoid swinging.','kg',1),
 e('hanging','Hanging Knee/Leg Raise',3,10,15,'Bodyweight','Abs','Avoid swinging; gently curl your pelvis upward. Use bent knees before progressing to straighter legs.','bodyweight')
 ]},
 {day:'Thursday',short:'THU',title:'Finish the core week strong.',focus:'Legs, chest & shoulder accessories',time:'70–85 min',tag:'Balanced hypertrophy',note:'If Tuesday left your lower back or hamstrings excessively fatigued, reduce Romanian deadlift loading. Prioritize recovery over forcing another hard hinge.',exercises:[
 e('legpress','Leg Press',3,8,12,'80–150 kg · machine-dependent','Quads','Keep your pelvis stable and use a controlled comfortable depth. Trial plates vary by machine.'),
 e('split','Bulgarian Split Squat',2,8,12,'6–12 kg / hand · reps per leg','Quads','Use support for balance if needed. Keep the front foot stable and complete reps on each leg.','kg',1),
 e('rdl','Romanian Deadlift',2,8,10,'30–55 kg','Hamstrings','Hinge at your hips with soft knees, keeping the load close. Stop before losing position.'),
 e('curl-thu','Seated Leg Curl',2,10,15,'20–40 kg','Hamstrings','Keep your hips in contact with the seat. Control both directions.'),
 e('incline-machine','Incline Chest Press Machine',3,8,12,'25–45 kg','Chest','Adjust the seat for a comfortable pressing path. Keep your shoulders stable.'),
 e('lateral-thu','Dumbbell Lateral Raise',2,12,20,'Controlled load','Shoulders','Use smooth reps and no momentum.','kg',1),
 e('extension','Dumbbell Overhead Triceps Extension',3,10,15,'Controlled load','Triceps','Keep the upper arms stable and choose a comfortable shoulder and elbow position.','kg',1),
 e('calf-thu','Standing Calf Raise',2,12,20,'25–50 kg','Calves','Pause through the range; avoid bouncing.')
 ]},
 {day:'Friday',short:'FRI',title:'A little extra, if you feel good.',focus:'Optional shoulders, arms & cardio',time:'35–50 min',tag:'Always optional',note:'Skipping Friday creates no training deficit. Do not redistribute these sets. Optional supported abs may be added; no floor exercises.',exercises:[
 e('lateral-fri','Dumbbell Lateral Raise',2,12,20,'Controlled load','Shoulders','Keep this session low-fatigue and controlled.','kg',1),
 e('preacher','Preacher Curl',2,10,15,'Controlled load','Biceps','Keep your upper arms supported and lower slowly.'),
 e('pushdown-fri','Rope Triceps Pushdown',2,10,15,'Controlled load','Triceps','Keep elbows close and avoid body momentum.'),
 e('rear-fri','Rear Delt Fly',2,12,20,'Controlled load','Shoulders','Use a supported position and controlled range.'),
 e('treadmill','Incline Treadmill Walking',1,15,20,'15–20 minutes · easy/moderate','Cardio','Choose a pace and incline you can recover from. Log minutes in the reps/min field.','cardio')
 ]}
];
export const volumes=[['Chest',11],['Back',10],['Shoulders',11],['Biceps',6],['Triceps',6],['Quads',8],['Hamstrings',6],['Calves',5],['Abs',6]];
export const phases=[
 {title:'Foundation & initial fat loss',label:'Build the habit',weeks:'01–13',text:'Calibrate your working weights in the first two weeks. Establish four consistent sessions and begin gradual fat loss. Use fewer accessory sets if soreness is excessive.'},
 {title:'Definition & consistency',label:'Find your rhythm',weeks:'14–26',text:'Continue moderate fat loss if needed, maintain strength and review recovery. Add priority volume only when training quality and recovery justify it.'},
 {title:'Lean muscle development',label:'Grow with intention',weeks:'27–39',text:'If sufficiently lean, establish maintenance from actual weight trends before adding a small surplus. Otherwise continue gradual fat loss. Do not bulk automatically.'},
 {title:'Definition & consolidation',label:'Make it sustainable',weeks:'40–52',text:'Use a modest deficit only if needed, preserving strength and muscle. Review waist, photos and performance together. Avoid crash dieting and excessive cardio.'}
];
