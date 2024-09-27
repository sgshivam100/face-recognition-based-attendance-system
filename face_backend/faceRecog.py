import face_recognition
import os
import cv2
import pandas as pd
import json

df = pd.read_excel('names.xlsx')

for i in range(0, len(df)):
    df['status'][i] = 'A'

known_faces_dir = "known_faces"
unknown_faces_dir = "unknown_faces"
tolerance = 0.4

frame_thickness = 3
font_thickness = 2
Model = "cnn"

print("loading known faces")

known_faces = []
known_names = []

for name in os.listdir(known_faces_dir):
    for filename in os.listdir(f"{known_faces_dir}/{name}"):
        image = face_recognition.load_image_file(f"{known_faces_dir}/{name}/{filename}")
        encoding = face_recognition.face_encodings(image)[0]
        known_faces.append(encoding)
        known_names.append(name)

print("processing unknown faces")
attendance_dict = {}

for filename in os.listdir(unknown_faces_dir):
    print(filename)
    image = face_recognition.load_image_file(f"{unknown_faces_dir}/{filename}")
    locations = face_recognition.face_locations(image, model=Model)
    encodings = face_recognition.face_encodings(image, locations)
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    for face_encoding, face_location in zip(encodings, locations):
        results = face_recognition.compare_faces(known_faces, face_encoding, tolerance)
        Match = None
        if True in results:
            Match = known_names[results.index(True)]
            for k in range(0, len(df)):
                if df['names'][k] == Match:
                    df['status'][k] = 'P'

            print(f"Match found: {Match}")

            top_left = (face_location[3], face_location[0])
            bottom_right = (face_location[1], face_location[2])

            color = [0, 255, 0]

            cv2.rectangle(image, top_left, bottom_right, color, frame_thickness)

            top_left = (face_location[3], face_location[2])
            bottom_right = (face_location[1], face_location[2] + 22)
            cv2.rectangle(image, top_left, bottom_right, color, cv2.FILLED)
            cv2.putText(image, Match, (face_location[3] + 10, face_location[2] + 15),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), font_thickness)

            # Record attendance in the dictionary
            attendance_dict[Match] = 'Present'

    cv2.imshow(filename, image)
    cv2.destroyWindow(filename)

# Save attendance dictionary as JSON file
with open('attendance.json', 'w') as json_file:
    json.dump(attendance_dict, json_file)

print("Writing attendance to excel file...")
df.to_excel('attendance.xlsx', index=False)
