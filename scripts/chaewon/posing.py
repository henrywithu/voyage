"""Evaluate Chaewon in a pose (bpy): posed body/eyes vertices, bone matrices and the head transform."""
import numpy as np

import bpy

import rig


def bone_world(arm, name):
    return np.array(arm.matrix_world @ arm.pose.bones[name].matrix)


def rest_world(arm, name):
    return np.array(arm.matrix_world @ arm.data.bones[name].matrix_local)


def evaluate(arm, body, eyes):
    """Posed geometry and transforms after the current pose is set on `arm`."""
    rig.update()
    P = rig.evaluated_vertices(body)
    E = rig.evaluated_vertices(eyes)
    head = bone_world(arm, 'head') @ np.linalg.inv(rest_world(arm, 'head'))
    mats = {pb.name: bone_world(arm, pb.name) for pb in arm.pose.bones}
    return dict(P=P, E=E, head_xf=head, mats=mats)
