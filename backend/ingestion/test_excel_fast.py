from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET


FILE_PATH = (
    Path(__file__).resolve().parents[2]
    / "Active Customer #.xlsx"
)


NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def read_template_rows():
    print("Opening XLSX file...")

    with ZipFile(FILE_PATH, "r") as xlsx:

        print("Reading workbook structure...")

        workbook_xml = ET.fromstring(
            xlsx.read("xl/workbook.xml")
        )

        relationships_xml = ET.fromstring(
            xlsx.read("xl/_rels/workbook.xml.rels")
        )

        relationships = {}

        for relationship in relationships_xml:
            relationships[relationship.attrib["Id"]] = relationship.attrib["Target"]

        template_target = None

        for sheet in workbook_xml.find("main:sheets", NS):
            if sheet.attrib["name"] == "Template":
                relationship_id = sheet.attrib[
                    "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
                ]

                template_target = relationships[relationship_id]
                break

        if not template_target:
            raise RuntimeError("Template sheet not found.")

        template_path = "xl/" + template_target.lstrip("/")

        print(f"Reading: {template_path}")

        sheet_xml = ET.fromstring(
            xlsx.read(template_path)
        )

        result = {}

        for row in sheet_xml.findall(".//main:row", NS):

            row_number = int(row.attrib["r"])

            if 22026 <= row_number <= 22031:

                values = {}

                for cell in row.findall("main:c", NS):

                    cell_reference = cell.attrib["r"]

                    value_element = cell.find("main:v", NS)

                    value = (
                        value_element.text
                        if value_element is not None
                        else None
                    )

                    values[cell_reference] = value

                result[row_number] = values

        return result


if __name__ == "__main__":

    print(f"File: {FILE_PATH}")

    result = read_template_rows()

    print("\nRESULT:\n")

    for row_number, values in result.items():
        print(row_number, values)

    print("\nFinished.")